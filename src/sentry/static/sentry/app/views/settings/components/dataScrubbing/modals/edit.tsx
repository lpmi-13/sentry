import omit from 'lodash/omit';

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
    const values: ModalManager['state']['values'] = {
      ...super.getDefaultState().values,
      ...omit(savedRules[ruleId], 'id'),
    };
    return {
      ...super.getDefaultState(),
      values,
    };
  }

  getTitle() {
    return t('Edit an advanced data scrubbing rule');
  }

  getNewRules() {
    const {savedRules, ruleId} = this.props;
    const updatedRule = {...this.state.values, id: ruleId};

    return savedRules.map(rule => {
      if (rule.id === updatedRule.id) {
        return updatedRule;
      }
      return rule;
    }) as Array<Rule>;
  }
}

export default Edit;
