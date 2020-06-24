import {t} from 'app/locale';

type Error = {
  type: 'unknown' | 'invalid-selector' | 'regex-parse';
  message: string;
};

// TODO(ts): define the correct error type
function handleError(error: any): Error {
  const errorMessage = error.responseJSON?.relayPiiConfig[0];

  if (!errorMessage) {
    return {
      type: 'unknown',
      message: t('Unknown error occurred while saving data scrubbing rule'),
    };
  }

  if (errorMessage.startsWith('invalid selector: ')) {
    for (const line of errorMessage.split('\n')) {
      if (line.startsWith('1 | ')) {
        const selector = line.slice(3);
        return {
          type: 'invalid-selector',
          message: t('Invalid source value: %s', selector),
        };
      }
    }
  }

  if (errorMessage.startsWith('regex parse error:')) {
    for (const line of errorMessage.split('\n')) {
      if (line.startsWith('error:')) {
        const regex = line.slice(6).replace(/at line \d+ column \d+/, '');
        return {
          type: 'regex-parse',
          message: t('Invalid regex: %s', regex),
        };
      }
    }
  }

  return {
    type: 'unknown',
    message: t('An unknown error occurred while saving data scrubbing rule'),
  };
}

export default handleError;
