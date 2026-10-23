import axios from 'axios';
import { withCurrentUser } from './current-user';

const request = axios.create({ timeout: 15000 });
request.interceptors.request.use(withCurrentUser);

export default request;
