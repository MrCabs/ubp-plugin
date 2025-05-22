import { combineReducers } from 'redux';

import { reducerHook as ActivityTimerReducer } from './ActivityTimer/reducer';

// Register all component states
export const reducerHook = () => {
  return combineReducers({
    ...ActivityTimerReducer(),
  });
};
