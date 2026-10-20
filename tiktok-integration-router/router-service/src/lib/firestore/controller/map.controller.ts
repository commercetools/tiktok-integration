import { Firestore } from '@google-cloud/firestore';
import { FIRESTORE_APP_PROJECT_MAP_COLLECTION_NAME } from '../../../constants';
import { logger } from '../../../utils/logger.utils';

/**
 * Interface for app-project mapping options
 */
export interface AppProjectMappingOptions {
  code?: string;
  shop_region?: string;
  locale?: string;
  seller_name?: string;
  seller_id?: string;
  code_consumed?: boolean;
  shop_id?: string;
  shop_cipher?: string;
  warehouses?: {
    id: string;
    entityId: string;
  }[];
}

/**
 * Interface for app-project mapping data
 */
export interface AppProjectMapping {
  app_key?: string;
  project_key?: string;
  service_url?: string;
  shop_id?: string;
  options?: AppProjectMappingOptions;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Store a new app-project mapping in Firestore
 * @param db - The Firestore database instance
 * @param app_key - Optional TikTok app key
 * @param project_key - Optional CommerceTools project key
 * @param service_url - Optional service URL
 * @param options - Optional mapping options (code, shop_region, locale)
 * @returns The document ID of the created mapping
 * @description If both app_key and project_key are provided, uses deterministic ID: {app_key}_{project_key}
 *              Otherwise generates a random document ID
 */
export const storeMapping = async (
  db: Firestore,
  app_key?: string,
  project_key?: string,
  service_url?: string,
  options?: AppProjectMappingOptions,
): Promise<string> => {
  const now = new Date().toISOString();
  
  const docRef = db.collection(FIRESTORE_APP_PROJECT_MAP_COLLECTION_NAME).doc();
  const docId = docRef.id;

  const mappingData: any = {
    ...(app_key && { app_key }),
    ...(project_key && { project_key }),
    ...(service_url && { service_url }),
    ...(options && { options }),
    createdAt: now,
    updatedAt: now,
  };  

  await docRef.set(mappingData);

  return docId;
};


/**
 * Get mapping by document ID
 * @param db - The Firestore database instance
 * @param docId - The document ID
 * @returns The mapping data or null if not found
 */
export const getMappingById = async (
  db: Firestore,
  docId: string,
): Promise<AppProjectMapping | null> => {
  const docRef = db
    .collection(FIRESTORE_APP_PROJECT_MAP_COLLECTION_NAME)
    .doc(docId);

  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as AppProjectMapping;
};

/**
 * Update service_url for all mappings with the given project_key
 * @param db - The Firestore database instance
 * @param project_key - The CommerceTools project key
 * @param data - The new data
 * @returns Number of documents updated
 */
export const updateDataByDocId = async (
  db: Firestore,
  docId: string,
  data: any,
): Promise<boolean> => {
  try {
    const collectionRef = db.collection(FIRESTORE_APP_PROJECT_MAP_COLLECTION_NAME);
    const docRef = collectionRef.doc(docId);
  
    const now = new Date().toISOString();
  
    await docRef.update({
      ...(data && { ...data }),
      updatedAt: now,
    });
  
    return true;
  } catch (error) {
    logger.error('Error updating data by docId', error);
    return false;
  }
};


/**
 * Update options for all mappings with the given document ID
 * @param db - The Firestore database instance
 * @param docId - The document ID
 * @param data - The new data
 * @returns Number of documents updated
 */
export const updateOptionsByDocId = async (
  db: Firestore,
  docId: string,
  newOptions: AppProjectMappingOptions,
): Promise<boolean> => {
  try {
    const collectionRef = db.collection(FIRESTORE_APP_PROJECT_MAP_COLLECTION_NAME);
    const docRef = collectionRef.doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return false;
    }
    const docData = doc.data() as AppProjectMapping;
    let options = docData.options || {};
    
    const now = new Date().toISOString();
    await docRef.update({
      options: {
        ...options,
        ...newOptions,
      },
      updatedAt: now,
    });
    return true;
  } catch (error) {
    logger.error('Error updating options by docId', error);
    return false;
  }
};


/**
 * Get mapping by seller_id
 * @param db - The Firestore database instance
 * @param seller_id - The TikTok seller ID
 * @returns The mapping for the given seller_id or null if not found
 * @description Queries for mappings where options.seller_id matches the provided seller_id
 */
export const getMappingByShopId = async (
  db: Firestore,
  shop_id: string,
): Promise<AppProjectMapping | null> => {
  try {
    const collectionRef = db.collection(FIRESTORE_APP_PROJECT_MAP_COLLECTION_NAME);
    const snapshot = await collectionRef.where('shop_id', '==', shop_id).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as AppProjectMapping;
  } catch (error) {
    logger.error('Error getting mapping by seller_id', error);
    return null;
  }
};

/**
 * Get options for a mapping with the given seller_id
 * @param db - The Firestore database instance
 * @param seller_id - The TikTok seller ID
 * @returns The options for the given seller_id or null if not found
 * @description Queries for mappings where options.seller_id matches the provided seller_id
 */
export const getOptionsByShopId = async (
  db: Firestore,
  shop_id: string,
): Promise<AppProjectMappingOptions | null> => {
  try {
    const mapping = await getMappingByShopId(db, shop_id);
    return mapping?.options || null;
  } catch (error) {
    logger.error('Error getting options by seller_id', error);
    return null;
  }
};