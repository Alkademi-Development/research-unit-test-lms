import { describe, afterEach, before } from 'mocha';
import pkg from 'selenium-webdriver';
const { By, until } = pkg;
import yargs from 'yargs'
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { enterDashboard } from '#root/commons/utils/dashboardUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
/**
 * Get the user data for authentication
 */

const user = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;

describe("Program", () => {

    afterEach(async () => {
        await driver.sleep(3000);
        await driver.quit();
    })
    
    BROWSERS.forEach(browser => {
        
        it(`Edit program in dashboard from browser ${browser}`, async () => {
                
            
            // Go to application
            driver = await goToApp(browser, appHost)
            await driver.manage().window().maximize();

            // login to the application
            await enterDashboard(driver, user);


            // Selections & Actions
            await driver.findElement(By.css('a > i.ri-icon.ri-rocket-line')).click();
            let loading = await driver.findElement(By.css('span.spinner-border'));
            await driver.wait(until.stalenessOf(loading));
            const tableRowData = await driver.executeScript(`return document.querySelectorAll('#datatables tbody tr')`);
            let editedRow;

            tableRowData.forEach(async row => {
                editedRow = await row.findElement(By.css('button.btn.btn-warning'));
                editedRow.click();
            })

            await driver.wait(until.elementsLocated(By.css(`div.card-wrapper`)));
            await driver.findElement(By.css('.card-wrapper')).isDisplayed();

            // Elements
            let formControls = await driver.findElements(By.css('.form-control'));
            let inputTitle = await formControls[1];
            let textareaSummary = await formControls[2];

            // Values
            let valueTitleFaker = faker.helpers.arrayElement(['Jongkoding', 'Alkamedia', 'Alkademi']);
            let valueSummaryFaker = faker.lorem.paragraphs(5);
            
            // Set Values
            inputTitle.clear();
            textareaSummary.clear();
            
            await inputTitle.sendKeys(valueTitleFaker);
            await textareaSummary.sendKeys(valueSummaryFaker);
                        
            // Periksa apakah semua elemen telah terisi
            const isAllFilled = await Promise.all([
                inputTitle.getAttribute('value'),
                textareaSummary.getAttribute('value'),
            ])
                .then(values => values.every(value => value !== ''));

            
            if(isAllFilled) {
                await driver.findElement(By.css("button[type='submit']")).click();
            }
            
            await driver.wait(until.elementLocated(By.css('#datatables')));
            loading = await driver.findElement(By.css('span.spinner-border'));
            await driver.wait(until.stalenessOf(loading));
            
            const findEditedRow = await tableRowData.some(item => item !== editedRow);

            // Result Output
            const pageUrl = await driver.getCurrentUrl();

            const alertDanger = await driver.findElements(By.css('.alert .alert-danger'));
            expect(alertDanger.length).to.equal(0);
            expect(isAllFilled).to.equal(true);
            expect(pageUrl).to.eq(appHost + 'dashboard/programs');
            expect(findEditedRow).to.be.equal(true);
            
            
        })

    })
    


});