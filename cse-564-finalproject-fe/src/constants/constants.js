export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const ENDPOINTS = {
    STATE_COUNT:'/api/state-count',
    ZIP_COUNT:'/api/zip-count',
    HOURLY:'/api/hourly',
    PARALLEL:'/api/parallel',
    STATE_ZIP:    state => `/api/state/${state}/zip-count`,
    STATE_HOURLY: state => `/api/state/${state}/hourly`,
    STATE_PARALLEL: state => `/api/state/${state}/parallel`,
  };