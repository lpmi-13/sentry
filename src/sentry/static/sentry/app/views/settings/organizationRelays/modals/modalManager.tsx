import React from 'react';
import omit from 'lodash/omit';
import isEqual from 'lodash/isEqual';

import {addErrorMessage} from 'app/actionCreators/indicator';
import {Client} from 'app/api';
import {t} from 'app/locale';
import {ModalRenderProps} from 'app/actionCreators/modal';
import {Organization, Relay} from 'app/types';

import Form from './form';
import Modal from './modal';
import handleXhrErrorResponse from './handleXhrErrorResponse';

type FormProps = React.ComponentProps<typeof Form>;
type Values = FormProps['values'];

type Props = ModalRenderProps & {
  onSubmitSuccess: (organization: Organization) => void;
  orgSlug: Organization['slug'];
  api: Client;
  savedRelays: Array<Relay>;
};

type State = {
  values: Values;
  requiredValues: Array<keyof Values>;
  disables: FormProps['disables'];
  errors: FormProps['errors'];
  isFormValid: boolean;
  title: string;
};

class DialogManager<
  P extends Props = Props,
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

  componentDidUpdate(_prevProps: Props, prevState: S) {
    if (!isEqual(prevState.values, this.state.values)) {
      this.handleValidateForm();
    }
  }

  getDefaultState(): Readonly<S> {
    return {
      values: {name: '', publicKey: '', description: ''},
      requiredValues: ['name', 'publicKey'],
      errors: {},
      disables: {},
      isFormValid: false,
      title: this.getTitle(),
    } as Readonly<S>;
  }

  getTitle(): string {
    return '';
  }

  getData(): {trustedRelays: Array<Relay>} {
    // Child has to implement this
    throw new Error('Not implemented');
  }

  clearError = <F extends keyof Values>(field: F) => {
    this.setState(prevState => ({
      errors: omit(prevState.errors, field),
    }));
  };

  convertErrorXhrResponse = (error: ReturnType<typeof handleXhrErrorResponse>) => {
    switch (error.type) {
      case 'invalid-key':
      case 'missing-key':
        this.setState(prevState => ({
          errors: {...prevState, publicKey: error.message},
        }));
        break;
      case 'empty-name':
      case 'missing-name':
        this.setState(prevState => ({
          errors: {...prevState, name: error.message},
        }));
        break;
      default:
        addErrorMessage(error.message);
    }
  };

  handleChange = <F extends keyof Values>(field: F, value: Values[F]) => {
    this.setState(prevState => ({
      values: {
        ...prevState.values,
        [field]: value,
      },
      errors: omit(prevState.errors, field),
    }));
  };

  handleSave = async () => {
    const {onSubmitSuccess, closeModal, orgSlug, api} = this.props;

    const trustedRelays = this.getData().trustedRelays.map(trustedRelay =>
      omit(trustedRelay, 'id')
    );

    try {
      const response = await api.requestPromise(`/organizations/${orgSlug}/`, {
        method: 'PUT',
        data: {trustedRelays},
      });
      onSubmitSuccess(response);
      closeModal();
    } catch (error) {
      this.convertErrorXhrResponse(handleXhrErrorResponse(error));
    }
  };

  handleValidateForm = () => {
    const {values, requiredValues} = this.state;
    const isFormValid = requiredValues.every(
      requiredValue => !!values[requiredValue].replace(/\s/g, '')
    );
    this.setState({isFormValid});
  };

  handleValidate = <F extends keyof Values>(field: F) => () => {
    const isFieldValueEmpty = !this.state.values[field].replace(/\s/g, '');

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
    const {values, errors, title, isFormValid, disables} = this.state;

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
            disables={disables}
          />
        }
      />
    );
  }
}

export default DialogManager;
