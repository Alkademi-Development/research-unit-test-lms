import clc from 'cli-color';
import { request } from './services-api.js';

const signIn = async (params, dataRequest) => {

    try {
        const res = await request.post('auth/signin')
          .set(params.sApp, params.sAppToken)
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