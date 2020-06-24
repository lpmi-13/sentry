import {Organization, Project} from 'app/types';
import {Client} from 'app/api';

import {valueSuggestions} from './utils';
import {EventId, SourceSuggestion, EventIdStatus} from './types';

const loadSourceSuggestions = async (
  api: Client,
  organization: Organization,
  eventId: EventId,
  projectId?: Project['id']
) => {
  if (!eventId.value) {
    return {
      sourceSuggestions: valueSuggestions,
      eventId: {
        ...eventId,
        status: undefined,
      },
    };
  }

  return {
    sourceSuggestions: valueSuggestions,
    eventId: {
      ...eventId,
      status: EventIdStatus.LOADING,
    },
  };

  try {
    const query: {projectId?: string; eventId: string} = {eventId: eventId.value};
    if (projectId) {
      query.projectId = projectId;
    }
    const rawSuggestions = await api.requestPromise(
      `/organizations/${organization.slug}/data-scrubbing-selector-suggestions/`,
      {query}
    );
    const sourceSuggestions: Array<SourceSuggestion> = rawSuggestions.suggestions;

    if (sourceSuggestions && sourceSuggestions.length > 0) {
      return {
        sourceSuggestions,
        eventId: {
          ...eventId,
          status: EventIdStatus.LOADED,
        },
      };
    }

    return {
      sourceSuggestions: valueSuggestions,
      eventId: {
        ...eventId,
        status: EventIdStatus.NOT_FOUND,
      },
    };
  } catch {
    return {
      sourceSuggestions: valueSuggestions,
      eventId: {
        ...eventId,
        status: EventIdStatus.ERROR,
      },
    };
  }
};

export default loadSourceSuggestions;
