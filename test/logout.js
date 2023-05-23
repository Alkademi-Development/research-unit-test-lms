const { describe, afterEach, before } = require('mocha');
const { Builder, By, Key, until, logging, Capabilities } = require('selenium-webdriver');
const assert = require('assert');
const { expect } = require("chai");
const { BROWSERS } = require('../commons/constants/browser');
const LOGIN_URL = process.env.LOGIN_URL;
const BASE_URL = process.env.BASE_URL

let user = {
    email: 'shivu@master.id',
    password: 'Terseraaah'
};
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

            const pageUrl = await driver.getCurrentUrl();

            expect(pageUrl).to.eq(BASE_URL);
            
        });
        
        it(`Logout (Mobile&Tablet Version) from browser ${browser}`, async () => {
                
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

            const pageUrl = await driver.getCurrentUrl();

            expect(pageUrl).to.eq(BASE_URL);
            
        });

    })
    


});