import { Auth } from 'aws-amplify';

const basePath = `${process.env.REACT_APP_API_PATH}/api`;

export const API = async(method, path, payload) => {
  const url = `${basePath}${path}`;


  const options = {
    method,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
    },
  };
  if (payload) options.body = JSON.stringify(payload);

  const response = await fetch(url, options);
  return response.json();
}
