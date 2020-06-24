import {t} from 'app/locale';

import ModalManager from './modalManager';

class Add extends ModalManager {
  getDefaultState() {
    return {
      ...super.getDefaultState(),
      values: {
        ...super.getDefaultState().values,
        id: String(this.props.savedRelays.length),
      },
    };
  }

  getTitle() {
    return t('New Relay Key');
  }

  getData() {
    const {savedRelays} = this.props;
    const trustedRelays = [...savedRelays, this.state.values];

    return {trustedRelays};
  }
}

export default Add;
