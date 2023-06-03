import { describe, it } from "mocha";
import supertest from "supertest";
const request = supertest('https://gorest.co.in/public-api');
import { expect } from "chai";

const TOKEN = '693fc7347943b693b5a7d7f610c20a487cc42b773f845449467cab7c9c073c1c';

// xdescribe('Users', () => {

//     it('GET /users', () => {
        
//         // request.get(`/users?access-token=${TOKEN}`)
//         // .end((err, res) => {
//         //     expect(res.body.data).to.not.be.empty;
//         //     done();
//         // })

//         return request.get(`/users?access-token=${TOKEN}`)
//         .then(res => {
//             expect(res.body.data).to.not.be.empty;
//         })

//     });

//     it('GET /users/:id', () => {
//         return request.get(`/users/1171?access-token=${TOKEN}`)
//         .then(res => {
//             expect(res.body.data).to.not.be.empty;
//             // expect(res.body.data.id).to.be.eq(1171);
//         })
//     });
    
//     it('GET /users with query params', () => {
//         const url = `/users?access-token=${TOKEN}&page=5&gender=female&status=active`
//         return request.get(url)
//         .then(res => {
//             expect(res.body.data).to.not.be.empty;
//             res.body.data.forEach(item => {
//                 expect(item.gender).to.eq('female');
//                 expect(item.status).to.eq('active');
//             });
//             // expect(res.body.data.id).to.be.eq(1171);
//         })
//     });

//     it.only('POST /users', () => {

//         const data = {
//             email: `test${Math.floor(Math.random() * 9999)}@mail.com`,
//             name: 'Tessst',
//             gender: 'male',
//             status: 'inactive',
//         };

//         return request
//         .post(`/users`)
//         .set('Authorization', `Bearer ${TOKEN}`)
//         .send(data)
//         .then((res) => {
//             // expect(res.body.data.email).to.eq(data.email);
//             // expect(res.body.data.status).to.eq(data.status);
//             expect(res.body.data).to.deep.include(data);
//         });
//     });

//     it('PUT /users/:id', () => {

//         const data = {
//             status: 'active',
//             name: 'John',
//         };

//         return request
//         .put(`/users/1881460`)
//         .set('Authorization', `Bearer ${TOKEN}`)
//         .send(data)
//         .then((res) => {
//             // expect(res.body.data.email).to.eq(data.email);
//             // expect(res.body.data.status).to.eq(data.status);
//             expect(res.body.data).to.deep.include(data);
//             expect(res.body.data.id).to.eq(1881460);
//         });
//     });

//     it('DELETE /users/:id', () => {

//         return request
//         .delete(`/users/1881460`)
//         .set('Authorization', `Bearer ${TOKEN}`)
//         .then((res) => {
//             expect(res.body.data).to.be.eq(null);
//         });
//     });

// });
