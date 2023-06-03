export const createRandomUser = async (requestUser, TOKEN) => {
    
    const userData = {
        email: `test${Math.floor(Math.random() * 9999)}@mail.com`,
        name: 'Tessst',
        gender: 'male',
        status: 'inactive',
    };

    const res = await requestUser
    .post(`users`)
    .set('Authorization', `Bearer ${TOKEN}`)
    .send(userData)
    
    return res.body.data.id;

}