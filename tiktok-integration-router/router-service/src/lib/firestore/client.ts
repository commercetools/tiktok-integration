import { Firestore } from '@google-cloud/firestore';

export const createFirestoreClient = ({
  projectId,
  databaseId,
  credentials,
}: {
  projectId: string;
  databaseId: string;
  credentials?: { client_email?: string; private_key?: string };
}) => {
  return new Firestore({
    projectId,
    databaseId,
    ...(credentials && { credentials }),
  });
};
