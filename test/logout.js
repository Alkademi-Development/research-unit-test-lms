const { describe, afterEach, before } = require('mocha');
const { Builder, By, Key, until, logging, Capabilities } = require('selenium-webdriver');
const assert = require('assert');
const { expect } = require("chai");
const { argv } = require('yargs');
const { BROWSERS } = require('../commons/constants/browser');
const LOGIN_URL = process.env.LOGIN_URL;
const BASE_URL = process.env.BASE_URL

/**
 * Get the user data for authentication
 */

let user = {
    name: '',
    email: '',
    password: '',
    kind: null,
};

if(argv?.data != null) {
    const data = argv?.data?.split(',');
    const role =  Number(data.find(item => item.includes("role")).split("=")[1]);
    
    if(role === 1) {
        user.email = 'alkademi.edu@gmail.com';
        user.password = 'semuasama'
    } else {
        user.email = 'shivu@master.id';
        user.password = 'Terseraaah'
    }
} else {
    user.email = 'shivu@master.id';
    user.password = 'Terseraaah'
}


let appHost = LOGIN_URL;
let driver;

describe("Login", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Logout from browser ${browser}`, async () => {
                
            driver = new Builder()
                .forBrowser(browser)
                .build();

            await driver.manage().window().maximize();
            await driver.get(appHost);

            // login to the application
            await driver.findElement(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/form/div[1]/div/input`)).sendKeys(user.email, Key.RETURN);
            await driver.findElement(By.xpath(`/html/body/div/div/div/div/div/div/div/div/div/div[2]/form/div[2]/div/input`)).sendKeys(user.password, Key.RETURN);
            await driver.wait(until.elementsLocated(By.css(`h1.text-welcome`)));
            
            await driver.findElement(By.css('.dropdown.navbar-profile')).click();
            await driver.findElement(By.css('.dropdown-menu.dropdown-menu-left > button')).click();
            await driver.findElement(By.css('.box-action > button.btn-danger')).click();

            await driver.wait(until.elementsLocated(By.css(`div.modal-content`)));
            
            const pageUrl = await driver.getCurrentUrl();

            expect(pageUrl).to.eq(BASE_URL);
            
        });

    })
    


});