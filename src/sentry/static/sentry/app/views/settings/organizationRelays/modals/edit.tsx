import {t} from 'app/locale';
import {Relay} from 'app/types';

import ModalManager from './modalManager';

type Props = {
  relay: Relay;
} & ModalManager['props'];

type State = ModalManager['state'];

class Edit extends ModalManager<Props, State> {
  getDefaultState() {
    return {
      ...super.getDefaultState(),
      values: {
        id: this.props.relay.id,
        name: this.props.relay.name,
        publicKey: this.props.relay.publicKey,
        description: this.props.relay.description || '',
      },
      disables: {publicKey: true},
    };
  }

  getTitle() {
    return t('Edit Relay Key');
  }

  getData() {
    const {savedRelays} = this.props;
    const updatedRelay = this.state.values;

    const trustedRelays = savedRelays.map(relay => {
      if (relay.id === updatedRelay.id) {
        return updatedRelay;
      }
      return relay;
    });

    return {trustedRelays};
  }
}

export default Edit;
