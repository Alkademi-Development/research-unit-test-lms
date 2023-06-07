import { describe, it } from "mocha";
import { expect } from "chai";
import { request, paramsRequest, apiParamsRequest } from "#root/api/services-api";
import { faker } from '@faker-js/faker';

describe('Users', () => {

    let userId = null;

    describe.skip('Create a User (POST)', () => {

        it('/users', () => {
            const data = {
                name: "Content " + faker.person.fullName(),
                email: "content@" + this.name + "gmail.com",
                password: "semuasama",
                phone: "08822222222",
                gender: faker.arrayElement(['L', 'P']),
                kind: 6
            };
    
            return request
            .post(`/user/create`)
            .set(paramsRequest.sApp, paramsRequest.sAppToken)
            .send(data)
            .then((res) => {
                // expect(res.body.data.email).to.eq(data.email);
                // expect(res.body.data.status).to.eq(data.status);
                expect(res.body.data).to.deep.include(data);
                userId = res.body.data.id;
            });
        })

    });

    describe('GET', () => {
        
        it('List User /users', () => {
    
            return request.get(`/user/list`)
            .set('Authorization', apiParamsRequest.Authorization)
            .set('AppToken', apiParamsRequest.AppToken)
            .then(res => {
                expect(res.body.data).to.not.be.empty;
                if(userId === null) userId = res?.body?.data[0].id;
            })
    
        });

        it('Detail User /users/:id', () => {
            return request.get(`/user/detail?userId=${userId}`)
            .set('Authorization', apiParamsRequest.Authorization)
            .set('AppToken', apiParamsRequest.AppToken)
            .then(res => {
                expect(res.body.data).to.not.be.empty;
                expect(res.body.data.id).to.be.eq(userId);
            })
        });

    })

    describe.skip('PUT', () => {
        
        it('/users/:id', () => {
    
            const data = {
                status: 'active',
                name: 'John',
            };
    
            return request
            .put(`/users/${userId}`)
            .set('Authorization', `Bearer ${TOKEN}`)
            .send(data)
            .then((res) => {
                // expect(res.body.data.email).to.eq(data.email);
                // expect(res.body.data.status).to.eq(data.status);
                expect(res.body.data).to.deep.include(data);
                expect(res.body.data.id).to.eq(userId);
            });
        });

    })

    describe.skip('DELETE', () => {

        it('/users/:id', () => {
    
            return request
            .delete(`/users/${userId}`)
            .set('Authorization', `Bearer ${TOKEN}`)
            .then((res) => {
                expect(res.body.data).to.be.eq(null);
            });
        });

    })


});
