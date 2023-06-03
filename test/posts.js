import { before, beforeEach, describe, it } from "mocha";
import supertest from "supertest";
import { expect } from "chai";
import { createRandomUser } from "../helper/user_helper";

let postId, userId;
const request = supertest(`https://gorest.co.in/public-api/users/${userId}/`);
const requestUser = supertest(`https://gorest.co.in/public-api/`);
const TOKEN = '693fc7347943b693b5a7d7f610c20a487cc42b773f845449467cab7c9c073c1c';

describe.only('User Posts', () => {

    before(async () => {

        // const userData = {
        //     email: `test${Math.floor(Math.random() * 9999)}@mail.com`,
        //     name: 'Tessst',
        //     gender: 'male',
        //     status: 'inactive',
        // };

        // const res = await requestUser
        // .post(`users`)
        // .set('Authorization', `Bearer ${TOKEN}`)
        // .send(userData)
        
        // expect(res.body.data).to.deep.include(userData);
        // userId = res.body.data.id;
        
        userId = await createRandomUser(requestUser, TOKEN);

    });

    it('/posts', async () => {
        const data = {
            user_id: userId,
            title: "My Title",
            body: "My Blog Post"
        }
        
        const postRes = await request
        .post('posts')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send(data);

        // console.log(postRes.body);

        // expect(postRes.body.data).to.deep.include(data);
        postId = postRes.body.data.id;

    })

    it('GET /posts/:id', async () => {
        await request.get(`posts/${postId}`)
        .set('Authorization', `Bearer ${TOKEN}`)
        expect(200)
    })

})