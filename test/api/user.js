import { describe, it } from "mocha";
import { expect } from "chai";
import { request, paramsRequest, apiParamsRequest } from "#root/api/services-api";
import { faker } from '@faker-js/faker';

describe('Users', () => {

    let userId = null;

    describe('(POST)', () => {

        it('Create a User /user/create', () => {
            const data = {
                name: "Content " + faker.person.fullName(),
                password: "semuasama",
                phone: "08822222222",
                gender: faker.helpers.arrayElement(['L', 'P']),
                kind: 6
            };
            data.email = data.name.replaceAll(" ", "").toLowerCase() + "@gmail.com";
    
            return request
            .post(`/user/create`)
            .set('Authorization', apiParamsRequest.Authorization)
            .set('AppToken', apiParamsRequest.AppToken)
            .send(data)
            .then((res) => {
                expect(res.body).to.have.property('data').that.exist;
                expect(res.body.data.email).to.equal(data.email);
                userId = res.body.data.id;
            });
        })

    });

    describe('GET', () => {
        
        it('List User /user/list', () => {
    
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
        
        it('Edit User /user/edit?userId=:id', () => {
    
            const data = {
                name: 'John',
            };
    
            return request
            .post(`/user/edit?userId=${userId}`)
            .set('Authorization', apiParamsRequest.Authorization)
            .set('AppToken', apiParamsRequest.AppToken)
            .send(data)
            .then((res) => {
                expect(res?.body?.status).to.equal(true);
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
