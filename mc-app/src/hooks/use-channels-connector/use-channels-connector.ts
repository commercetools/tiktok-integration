/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import type { ApolloError } from '@apollo/client';
import {
  useMcQuery,
  useMcMutation,
  useMcLazyQuery,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import { buildCustomFieldActions } from '../custom-fields';
import FetchChannelsQuery from './fetch-channels.ctp.graphql';
import FetchChannelByIdQuery from './fetch-channel-by-id.ctp.graphql';
import UpdateChannelCustomMutation from './update-channel-custom.ctp.graphql';

type TCustomFieldRaw = {
  name: string;
  value: unknown;
};

type TCustomType = {
  id: string;
  key: string;
};

type TLocalizedString = {
  locale: string;
  value: string;
};

type TChannel = {
  id: string;
  version: number;
  key: string;
  roles: string[];
  name?: string;
  nameAllLocales?: TLocalizedString[];
  description?: string;
  descriptionAllLocales?: TLocalizedString[];
  custom?: {
    type: TCustomType;
    customFieldsRaw: TCustomFieldRaw[];
  };
};

type TFetchChannelsQuery = {
  channels: {
    total: number;
    count: number;
    offset: number;
    results: TChannel[];
  };
};

type TFetchChannelsQueryVariables = {
  limit?: number;
  offset?: number;
  sort?: string[];
};

type TFetchChannelByIdQuery = {
  channel?: TChannel;
};

type TFetchChannelByIdQueryVariables = {
  channelId: string;
};

type TUpdateChannelCustomMutation = {
  updateChannel: TChannel;
};

type TUpdateChannelCustomMutationVariables = {
  channelId: string;
  version: number;
  actions: ReturnType<typeof buildCustomFieldActions>;
};

type TUseChannelsFetcher = (variables?: TFetchChannelsQueryVariables) => {
  channels?: TChannel[];
  channelsResult?: TFetchChannelsQuery['channels'];
  error?: ApolloError;
  loading: boolean;
  refetch: () => void;
};

export const useChannelsFetcher: TUseChannelsFetcher = (variables = {}) => {
  const { data, error, loading, refetch } = useMcQuery<
    TFetchChannelsQuery,
    TFetchChannelsQueryVariables
  >(FetchChannelsQuery, {
    variables: {
      limit: variables.limit || 500,
      offset: variables.offset || 0,
      sort: variables.sort || ['createdAt asc'],
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  return {
    channels: data?.channels?.results,
    channelsResult: data?.channels,
    error,
    loading,
    refetch,
  };
};

type TUseChannelByIdFetcher = () => {
  getChannelById: (channelId: string) => Promise<TChannel | undefined>;
  loading: boolean;
};

export const useChannelByIdFetcher: TUseChannelByIdFetcher = () => {
  const [fetchChannel, { loading }] = useMcLazyQuery<
    TFetchChannelByIdQuery,
    TFetchChannelByIdQueryVariables
  >(FetchChannelByIdQuery);

  const getChannelById = async (
    channelId: string
  ): Promise<TChannel | undefined> => {
    const result = await fetchChannel({
      variables: { channelId },
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      fetchPolicy: 'network-only',
    });

    return result.data?.channel;
  };

  return {
    getChannelById,
    loading,
  };
};

type TUseChannelCustomUpdater = () => {
  updateChannelCustom: (params: {
    channelId: string;
    typeKey: string;
    fields: Record<string, unknown>;
  }) => Promise<TChannel>;
  loading: boolean;
};

export const useChannelCustomUpdater: TUseChannelCustomUpdater = () => {
  const { getChannelById } = useChannelByIdFetcher();
  const [updateChannelMutation, { loading }] = useMcMutation<
    TUpdateChannelCustomMutation,
    TUpdateChannelCustomMutationVariables
  >(UpdateChannelCustomMutation);

  const updateChannelCustom = async ({
    channelId,
    typeKey,
    fields,
  }: {
    channelId: string;
    typeKey: string;
    fields: Record<string, unknown>;
  }) => {
    // Fetch the latest version first
    const channel = await getChannelById(channelId);

    if (!channel) {
      throw new Error(`Channel with id ${channelId} not found`);
    }

    const actions = buildCustomFieldActions(channel, typeKey, fields);

    const result = await updateChannelMutation({
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      variables: {
        channelId,
        version: channel.version,
        actions,
      },
    });

    if (!result.data?.updateChannel) {
      throw new Error('Failed to update channel custom fields');
    }

    return result.data.updateChannel;
  };

  return {
    updateChannelCustom,
    loading,
  };
};
