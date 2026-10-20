import { useServiceUrl } from '../../contexts';

type UseTestService = () => {
  callTestEndpoint: () => Promise<any>;
};

export const useTestService: UseTestService = () => {
  const { serviceUrl } = useServiceUrl();

  const callTestEndpoint = async () => {
    if (!serviceUrl) {
      throw new Error('Service URL is not configured');
    }

    const response = await fetch(`${serviceUrl}/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  };

  return {
    callTestEndpoint,
  };
};
