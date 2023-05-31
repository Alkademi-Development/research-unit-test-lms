import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { appHost } from '#root/api/app-token';

/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;

describe("Classroom", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it.skip(`Check for class card from ${browser}`, async () => {
                
            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();
            
            // login to the application
            await enterDashboard(driver, user);

            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

            await driver.findElement(By.css('a i.ri-icon.ri-stack-fill')).click();
            
            let cardClass = await driver.findElement(By.css(`div.card-class`));
            await driver.wait(until.stalenessOf(cardClass));
            let classCard = await driver.findElement(By.css('div.card-class')).isDisplayed();

            // Tampilkan data jaringan
            let userData = await driver.executeScript("return window.localStorage.getItem('user')")
            userData = JSON.parse(userData);
            
            assert.strictEqual(textStatus > 1, textStatus > 1); 
            expect(userData.id).to.greaterThan(0);
            expect(classCard).to.equal(true);
            
        });

        it(`Check all process in tab all class from ${browser}`, async function() {

            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();
            
            // login to the application
            await enterDashboard(driver, user);


            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

            await driver.findElement(By.css('a i.ri-icon.ri-stack-fill')).click();

            let cardClass = await driver.findElement(By.css(`div.card-class`));
            await driver.wait(until.stalenessOf(cardClass));
            let classCard = await driver.findElement(By.css('div.card-class')).isDisplayed();

            // Selection & Actions
            let tabsTypeClass = await driver.findElements(By.css('div.item-tab'));
            await tabsTypeClass[1];

            let badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));
            let badgeClasses = await Promise.all(
                badgesProgress.map(async (badge) => {
                  let badgeClass = await badge.getAttribute('class');
                  badgeClass = badgeClass.replace("badge-progress ", "");
                  return badgeClass;
                })
            );
            let allTypesBadge = ['badge-program', 'badge-blue', 'badge-green', 'badge-red'];

            let hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));
            
            let allTypesFound = false;
            while (!allTypesFound) {
            
                badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));

                badgeClasses = await Promise.all(
                    badgesProgress.map(async (badge) => {
                        let badgeClass = await badge.getAttribute('class');
                        badgeClass = badgeClass.replace("badge-progress ", "");
                        return badgeClass;
                    })
                );

                hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));

                if(hasAllTypes === true) {
                    allTypesFound = true;
                }
            
                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                await driver.sleep(1000); // Sesuaikan jeda jika diperlukan
            }            
              
              
            // Result the outputs
            expect(classCard).to.equal(true);
            expect(hasAllTypes).to.equal(true);

        })
        
        it(`Check register process in tab register class from ${browser}`, async function() {

            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();
            
            // login to the application
            await enterDashboard(driver, user);


            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

            await driver.findElement(By.css('a i.ri-icon.ri-stack-fill')).click();

            let cardClass = await driver.findElement(By.css(`div.card-class`));
            await driver.wait(until.stalenessOf(cardClass));
            let classCard = await driver.findElement(By.css('div.card-class')).isDisplayed();

            // Selection & Actions
            let tabsTypeClass = await driver.findElements(By.css('div.item-tab'));
            await tabsTypeClass[2].click();

            let badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));
            let badgeClasses = await Promise.all(
                badgesProgress.map(async (badge) => {
                  let badgeClass = await badge.getAttribute('class');
                  badgeClass = badgeClass.replace("badge-progress ", "");
                  return badgeClass;
                })
            );
            let allTypesBadge = ['badge-program', 'badge-blue', 'badge-green'];

            let hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));
            
            let allTypesFound = false;
            while (!allTypesFound) {
            
                badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));

                badgeClasses = await Promise.all(
                    badgesProgress.map(async (badge) => {
                        let badgeClass = await badge.getAttribute('class');
                        badgeClass = badgeClass.replace("badge-progress ", "");
                        return badgeClass;
                    })
                );

                hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));

                if(hasAllTypes === true) {
                    allTypesFound = true;
                }
            
                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                await driver.sleep(1000); // Sesuaikan jeda jika diperlukan
            }            
              
              
            // Result the outputs
            expect(classCard).to.equal(true);
            expect(hasAllTypes).to.equal(true);

        })
        
        it(`Check occur process in tab occur class from ${browser}`, async function() {

            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();
            
            // login to the application
            await enterDashboard(driver, user);


            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

            await driver.findElement(By.css('a i.ri-icon.ri-stack-fill')).click();

            let cardClass = await driver.findElement(By.css(`div.card-class`));
            await driver.wait(until.stalenessOf(cardClass));
            let classCard = await driver.findElement(By.css('div.card-class')).isDisplayed();

            // Selection & Actions
            let tabsTypeClass = await driver.findElements(By.css('div.item-tab'));
            await tabsTypeClass[3].click();

            let badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));
            let badgeClasses = await Promise.all(
                badgesProgress.map(async (badge) => {
                  let badgeClass = await badge.getAttribute('class');
                  badgeClass = badgeClass.replace("badge-progress ", "");
                  return badgeClass;
                })
            );
            let allTypesBadge = ['badge-program', 'badge-blue', 'badge-green'];

            let hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));
            
            let allTypesFound = false;
            while (!allTypesFound) {
            
                badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));

                badgeClasses = await Promise.all(
                    badgesProgress.map(async (badge) => {
                        let badgeClass = await badge.getAttribute('class');
                        badgeClass = badgeClass.replace("badge-progress ", "");
                        return badgeClass;
                    })
                );

                hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));

                if(hasAllTypes === true) {
                    allTypesFound = true;
                }
            
                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                await driver.sleep(1000); // Sesuaikan jeda jika diperlukan
            }            
              
              
            // Result the outputs
            expect(classCard).to.equal(true);
            expect(hasAllTypes).to.equal(true);

        })

        it(`Check done process in tab done class from ${browser}`, async function() {

            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();
            
            // login to the application
            await enterDashboard(driver, user);


            let textStatus = await driver.executeScript(`return document.querySelectorAll('h1.text-welcome').length`);

            await driver.findElement(By.css('a i.ri-icon.ri-stack-fill')).click();

            let cardClass = await driver.findElement(By.css(`div.card-class`));
            await driver.wait(until.stalenessOf(cardClass));
            let classCard = await driver.findElement(By.css('div.card-class')).isDisplayed();

            // Selection & Actions
            let tabsTypeClass = await driver.findElements(By.css('div.item-tab'));
            await tabsTypeClass[4].click();

            let badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));
            let badgeClasses = await Promise.all(
                badgesProgress.map(async (badge) => {
                  let badgeClass = await badge.getAttribute('class');
                  badgeClass = badgeClass.replace("badge-progress ", "");
                  return badgeClass;
                })
            );
            let allTypesBadge = ['badge-program', 'badge-red'];

            let hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));
            
            let allTypesFound = false;
            while (!allTypesFound) {
            
                badgesProgress = await driver.findElements(By.css('div.box-progress p.badge-progress'));

                badgeClasses = await Promise.all(
                    badgesProgress.map(async (badge) => {
                        let badgeClass = await badge.getAttribute('class');
                        badgeClass = badgeClass.replace("badge-progress ", "");
                        return badgeClass;
                    })
                );

                hasAllTypes = allTypesBadge.every(type => badgeClasses.includes(type));

                if(hasAllTypes === true) {
                    allTypesFound = true;
                }
            
                await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                await driver.sleep(1000); // Sesuaikan jeda jika diperlukan
            }            
              
              
            // Result the outputs
            expect(classCard).to.equal(true);
            expect(hasAllTypes).to.equal(true);

        })

    })
    


});