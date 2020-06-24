import React from 'react';
import omit from 'lodash/omit';
import isEqual from 'lodash/isEqual';

import {addErrorMessage} from 'app/actionCreators/indicator';
import {Client} from 'app/api';
import {t} from 'app/locale';
import {ModalRenderProps} from 'app/actionCreators/modal';
import {Organization, Project} from 'app/types';

import {RuleType, MethodType, Rule, ProjectId, KeysOfUnion} from '../types';
import submitRules from '../submitRules';
import Form from './form';
import Modal from './modal';
import handleError from './handleError';

type FormProps = React.ComponentProps<typeof Form>;
type Values = FormProps['values'];

type Props<T extends ProjectId> = ModalRenderProps & {
  onSubmitSuccess: (data: T extends undefined ? Organization : Project) => void;
  orgSlug: Organization['slug'];
  api: Client;
  endpoint: string;
  sourceSuggestions: FormProps['sourceSuggestions'];
  savedRules: Array<Rule>;
  projectId?: T;
  onUpdateEventId?: FormProps['onUpdateEventId'];
  eventId?: FormProps['eventId'];
};

type State = {
  values: Values;
  requiredValues: Array<keyof Values>;
  errors: FormProps['errors'];
  isFormValid: boolean;
  title: string;
};

class ModalManager<
  T extends ProjectId = undefined,
  P extends Props<T> = Props<T>,
  S extends State = State
> extends React.Component<P, S> {
  constructor(props: P) {
    super(props);
    this.handleSave = this.handleSave.bind(this);
    this.state = this.getDefaultState() as Readonly<S>;
  }

  componentDidMount() {
    this.handleValidateForm();
  }

  componentDidUpdate(_prevProps: Props<T>, prevState: S) {
    if (!isEqual(prevState.values, this.state.values)) {
      this.handleValidateForm();
    }
  }

  getDefaultState(): Readonly<S> {
    const values: Values = {
      type: RuleType.CREDITCARD,
      method: MethodType.MASK,
      source: '',
      placeholder: '',
      pattern: '',
    };
    return {
      values,
      requiredValues: this.getRequiredValues(values),
      errors: {},
      isFormValid: false,
      title: this.getTitle(),
    } as Readonly<S>;
  }

  getTitle(): string {
    return '';
  }

  getNewRules(): Array<Rule> {
    // Child has to implement this
    throw new Error('Not implemented');
  }

  getRequiredValues = (values: Values) => {
    const {type} = values;
    const requiredValues: Array<KeysOfUnion<Values>> = ['type', 'method', 'source'];

    if (type === RuleType.PATTERN) {
      requiredValues.push('pattern');
    }

    return requiredValues;
  };

  clearError = <F extends keyof Values>(field: F) => {
    this.setState(prevState => ({
      errors: omit(prevState.errors, field),
    }));
  };

  convertRequestError = (error: ReturnType<typeof handleError>) => {
    switch (error.type) {
      case 'invalid-selector':
        this.setState(prevState => ({
          errors: {
            ...prevState.errors,
            source: error.message,
          },
        }));
        break;
      case 'regex-parse':
        this.setState(prevState => ({
          errors: {
            ...prevState.errors,
            pattern: error.message,
          },
        }));
        break;
      default:
        addErrorMessage(error.message);
    }
  };

  handleChange = <R extends Rule, K extends KeysOfUnion<R>>(field: K, value: R[K]) => {
    const values = {
      ...this.state.values,
      [field]: value,
    };

    this.setState(prevState => ({
      values,
      requiredValues: this.getRequiredValues(values),
      errors: omit(prevState.errors, field),
    }));
  };

  handleSave = async () => {
    const {endpoint, api, onSubmitSuccess, closeModal} = this.props;
    const newRules = this.getNewRules();

    try {
      const data = await submitRules(api, endpoint, newRules);
      closeModal();
      onSubmitSuccess(data);
    } catch (error) {
      this.convertRequestError(handleError(error));
    }
  };

  handleValidateForm = () => {
    const {values, requiredValues} = this.state;
    const isFormValid = requiredValues.every(requiredValue => !!values[requiredValue]);
    this.setState({isFormValid});
  };

  handleValidate = <K extends keyof Values>(field: K) => () => {
    const isFieldValueEmpty = !this.state.values[field].trim();

    const fieldErrorAlreadyExist = this.state.errors[field];

    if (isFieldValueEmpty && fieldErrorAlreadyExist) {
      return;
    }

    if (isFieldValueEmpty && !fieldErrorAlreadyExist) {
      this.setState(prevState => ({
        errors: {
          ...prevState.errors,
          [field]: t('Field Required'),
        },
      }));
      return;
    }

    if (!isFieldValueEmpty && fieldErrorAlreadyExist) {
      this.clearError(field);
    }
  };

  render() {
    const {values, errors, title, isFormValid} = this.state;
    const {sourceSuggestions} = this.props;

    return (
      <Modal
        {...this.props}
        title={title}
        onSave={this.handleSave}
        disabled={!isFormValid}
        content={
          <Form
            onChange={this.handleChange}
            onValidate={this.handleValidate}
            errors={errors}
            values={values}
            sourceSuggestions={sourceSuggestions}
          />
        }
      />
    );
  }
}

export default ModalManager;
