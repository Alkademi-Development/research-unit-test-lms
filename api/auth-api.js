import clc from 'cli-color';
import { request, apiParamsRequest } from './services-api.js';

const signIn = async (dataRequest) => {

    try {
        const res = await request.post('auth/signin')
          // DEV
          // .set('Authorization', apiParamsRequest.Authorization)
          .set('AppToken', apiParamsRequest.AppToken)
          // STAGING
          // .set('D-App-Authorization', apiParamsRequest.dAppToken)
          .send(dataRequest);
    
        return res;
      } catch (err) {
        console.error(err);
        console.error(clc.red(clc.bold('Oops!, Something went wrong')));
        process.exit();
    }
}

export {
    signIn
}