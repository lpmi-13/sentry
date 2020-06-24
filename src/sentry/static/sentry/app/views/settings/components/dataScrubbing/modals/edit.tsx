import {t} from 'app/locale';

import ModalManager from './modalManager';
import {ProjectId, Rule} from '../types';

type Props<T extends ProjectId> = ModalManager<T>['props'] & {
  ruleId: Rule['id'];
};

type State = ModalManager['state'];

class Edit<T extends ProjectId> extends ModalManager<T, Props<T>, State> {
  getDefaultState() {
    const {savedRules, ruleId} = this.props;
    return {
      ...super.getDefaultState(),
      values: savedRules[ruleId],
    };
  }

  getTitle() {
    return t('Edit an advanced data scrubbing rule');
  }

  getNewRules() {
    const {savedRules} = this.props;
    const updatedRule = this.state.values;

    return savedRules.map(rule => {
      if (rule.id === updatedRule.id) {
        return updatedRule;
      }
      return rule;
    });
  }
}

export default Edit;
