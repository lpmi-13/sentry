import React from 'react';
import styled from '@emotion/styled';

import space from 'app/styles/space';
import {t, tct} from 'app/locale';
import {Panel, PanelAlert, PanelBody, PanelHeader} from 'app/components/panels';
import {Client} from 'app/api';
import {addErrorMessage, addSuccessMessage} from 'app/actionCreators/indicator';
import ExternalLink from 'app/components/links/externalLink';
import Button from 'app/components/button';
import {Organization, Project} from 'app/types';
import {openModal} from 'app/actionCreators/modal';

import Edit from './modals/edit';
import Add from './modals/add';
import {valueSuggestions} from './utils';
import OrganizationRules from './organizationRules';
import {Rule, EventIdStatus, SourceSuggestion, Errors, EventId, ProjectId} from './types';
import convertRelayPiiConfig from './convertRelayPiiConfig';
import submitRules from './submitRules';
import Content from './content';

const ADVANCED_DATASCRUBBING_LINK =
  'https://docs.sentry.io/data-management/advanced-datascrubbing/';

type Props<T extends ProjectId> = {
  endpoint: string;
  organization: Organization;
  onSubmitSuccess?: (data: T extends undefined ? Organization : Project) => void;
  projectId?: T;
  relayPiiConfig?: string;
  additionalContext?: React.ReactNode;
  disabled?: boolean;
};

type State = {
  rules: Array<Rule>;
  savedRules: Array<Rule>;
  sourceSuggestions: Array<SourceSuggestion>;
  eventId: EventId;
  orgRules: Array<Rule>;
  errors: Errors;
  relayPiiConfig?: string;
};

class DataScrubbing<T extends ProjectId = undefined> extends React.Component<
  Props<T>,
  State
> {
  state: State = {
    rules: [],
    savedRules: [],
    relayPiiConfig: this.props.relayPiiConfig,
    sourceSuggestions: [],
    eventId: {
      value: '',
    },
    orgRules: [],
    errors: {},
  };

  componentDidMount() {
    this.loadRules();
    this.loadSourceSuggestions();
    this.loadOrganizationRules();
  }

  componentDidUpdate(_prevProps: Props<T>, prevState: State) {
    if (prevState.relayPiiConfig !== this.state.relayPiiConfig) {
      this.loadRules();
    }
  }

  componentWillUnmount() {
    this.api.clear();
  }

  api = new Client();

  loadOrganizationRules = () => {
    const {organization, projectId} = this.props;

    if (projectId) {
      try {
        this.setState({
          orgRules: convertRelayPiiConfig(organization.relayPiiConfig),
        });
      } catch {
        addErrorMessage(t('Unable to load organization rules'));
      }
    }
  };

  loadRules() {
    try {
      const convertedRules = convertRelayPiiConfig(this.state.relayPiiConfig);
      this.setState({
        rules: convertedRules,
        savedRules: convertedRules,
      });
    } catch {
      addErrorMessage(t('Unable to load project rules'));
    }
  }

  loadSourceSuggestions = async () => {
    const {organization, projectId} = this.props;
    const {eventId} = this.state;

    if (!eventId.value) {
      this.setState(prevState => ({
        sourceSuggestions: valueSuggestions,
        eventId: {
          ...prevState.eventId,
          status: undefined,
        },
      }));
      return;
    }

    this.setState(prevState => ({
      sourceSuggestions: valueSuggestions,
      eventId: {
        ...prevState.eventId,
        status: EventIdStatus.LOADING,
      },
    }));

    try {
      const query: {projectId?: string; eventId: string} = {eventId: eventId.value};
      if (projectId) {
        query.projectId = projectId;
      }
      const rawSuggestions = await this.api.requestPromise(
        `/organizations/${organization.slug}/data-scrubbing-selector-suggestions/`,
        {query}
      );
      const sourceSuggestions: Array<SourceSuggestion> = rawSuggestions.suggestions;

      if (sourceSuggestions && sourceSuggestions.length > 0) {
        this.setState(prevState => ({
          sourceSuggestions,
          eventId: {
            ...prevState.eventId,
            status: EventIdStatus.LOADED,
          },
        }));
        return;
      }

      this.setState(prevState => ({
        sourceSuggestions: valueSuggestions,
        eventId: {
          ...prevState.eventId,
          status: EventIdStatus.NOT_FOUND,
        },
      }));
    } catch {
      this.setState(prevState => ({
        eventId: {
          ...prevState.eventId,
          status: EventIdStatus.ERROR,
        },
      }));
    }
  };

  handleUpdateEventId = (eventId: string) => {
    this.setState(
      {
        eventId: {
          value: eventId,
        },
      },
      this.loadSourceSuggestions
    );
  };

  successfullySaved = (
    response: T extends undefined ? Organization : Project,
    successMessage: string
  ) => {
    const {onSubmitSuccess} = this.props;
    this.setState({rules: convertRelayPiiConfig(response.relayPiiConfig)});
    addSuccessMessage(successMessage);
    if (onSubmitSuccess) {
      onSubmitSuccess(response);
    }
  };

  handleOpenAddDialog = () => {
    const {rules, sourceSuggestions, eventId} = this.state;
    openModal(modalProps => (
      <Add
        {...modalProps}
        onUpdateEventId={this.handleUpdateEventId}
        eventId={eventId}
        projectId={this.props.projectId}
        savedRules={rules}
        sourceSuggestions={sourceSuggestions}
        api={this.api}
        endpoint={this.props.endpoint}
        orgSlug={this.props.organization.slug}
        onSubmitSuccess={response => {
          this.successfullySaved(response, 'Successfully added data scrubbing rule');
        }}
      />
    ));
  };

  handleOpenAEditDialog = (id: Rule['id']) => () => {
    const {rules, sourceSuggestions, eventId} = this.state;
    openModal(modalProps => (
      <Edit
        {...modalProps}
        onUpdateEventId={this.handleUpdateEventId}
        eventId={eventId}
        ruleId={id}
        projectId={this.props.projectId}
        savedRules={rules}
        sourceSuggestions={sourceSuggestions}
        api={this.api}
        endpoint={this.props.endpoint}
        orgSlug={this.props.organization.slug}
        onSubmitSuccess={response => {
          this.successfullySaved(response, 'Successfully updated data scrubbing rule');
        }}
      />
    ));
  };

  handleDelete = (id: Rule['id']) => async () => {
    const {rules} = this.state;
    const filteredRules = rules.filter(rule => rule.id !== id);

    try {
      const data = await submitRules(this.api, this.props.endpoint, filteredRules);
      if (data?.relayPiiConfig) {
        const convertedRules = convertRelayPiiConfig(data.relayPiiConfig);
        this.setState({rules: convertedRules});
        addSuccessMessage('Successfully deleted data scrubbing rule');
      }
    } catch {
      addErrorMessage('An unknown error occurred while deleting data scrubbing rule');
    }
  };

  render() {
    const {additionalContext, disabled, projectId} = this.props;
    const {orgRules, rules} = this.state;

    return (
      <React.Fragment>
        <Panel>
          <PanelHeader>
            <div>{t('Advanced Data Scrubbing')}</div>
          </PanelHeader>
          <PanelAlert type="info">
            {additionalContext}{' '}
            {`${t('The new rules will only apply to upcoming events. ')}`}{' '}
            {tct('For more details, see [linkToDocs].', {
              linkToDocs: (
                <ExternalLink href={ADVANCED_DATASCRUBBING_LINK}>
                  {t('full documentation on data scrubbing')}
                </ExternalLink>
              ),
            })}
          </PanelAlert>
          <PanelBody>
            {projectId && <OrganizationRules rules={orgRules} />}
            <Content
              rules={rules}
              onDeleteRule={this.handleDelete}
              onEditRule={this.handleOpenAEditDialog}
              disabled={disabled}
            />
            <PanelAction>
              <Button href={ADVANCED_DATASCRUBBING_LINK} target="_blank">
                {t('Read the docs')}
              </Button>
              <Button
                disabled={disabled}
                onClick={this.handleOpenAddDialog}
                priority="primary"
              >
                {t('Add Rule')}
              </Button>
            </PanelAction>
          </PanelBody>
        </Panel>
      </React.Fragment>
    );
  }
}

export default DataScrubbing;

const PanelAction = styled('div')`
  padding: ${space(1)} ${space(2)};
  position: relative;
  display: grid;
  grid-gap: ${space(1)};
  grid-template-columns: auto auto;
  justify-content: flex-end;
  border-top: 1px solid ${p => p.theme.borderDark};
`;
