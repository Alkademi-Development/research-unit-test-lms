import pkg, { locateWith } from 'selenium-webdriver';
const { By, until } = pkg;
import { faker } from '@faker-js/faker';
import { captureConsoleErrors, thrownAnError } from '#root/commons/utils/generalUtils';


async function createData(driver) {

    // Aksi mendapatkan semua element input
    let titleModule = await driver.findElement(By.id('Judul *'));
    let textEditorTinyMce = await driver.wait(until.elementLocated(By.css('.tox-tinymce')));
    let textAreaDescriptionLocator = locateWith(By.tagName('textarea')).above(By.css('.tox-tinymce'));
    let descriptionModule = await driver.findElement(textAreaDescriptionLocator);
    let inputTypeFileModule = await driver.findElement(By.id('File'));
    let typeCourse = await driver.findElement(By.css('.vs__selected'));
    
    let iframeTextEditorMce = await textEditorTinyMce.findElement(By.css('.tox-edit-area > iframe'));
    let iframeBodyValue = faker.lorem.paragraphs(5).replace(/\n/g, '');
    await driver.switchTo().frame(iframeTextEditorMce);
    let iframeBody = await driver.findElement(By.css('body'));
    await iframeBody.clear();
    await driver.executeScript(`arguments[0].innerHTML = "${iframeBodyValue}";`, iframeBody);
    iframeBody = await driver.findElement(By.css('body'));
    await driver.switchTo().defaultContent();
    
    // Aksi mengisi semua form element input
    await titleModule.sendKeys(faker.lorem.words(3));
    await driver.sleep(3000);
    textAreaDescriptionLocator = locateWith(By.tagName('textarea')).above(By.css('.tox-tinymce'));
    descriptionModule = await driver.findElement(textAreaDescriptionLocator);
    await driver.sleep(3000);
    await driver.findElement(By.css('.multifile-forms-container .type-button')).click();
    await driver.wait(async () => {
        let dropdownMenuMultipleFile = await driver.findElement(By.css('.multifile-forms-container .dropdown-menu'));
        return dropdownMenuMultipleFile.isDisplayed();
    })
    let dropdownItems = await driver.findElements(By.css('.multifile-forms-container .dropdown-menu .dropdown-item'));
    let dropdownItemIndex = faker.number.int({ min: 0, max: await dropdownItems.length - 1 });
    await dropdownItems[dropdownItemIndex].click();
    switch (dropdownItemIndex) {
        case 0: // Dokumen
            await inputTypeFileModule.sendKeys('https://drive.google.com/file/d/1YnFUiFpRhQt8-yHxSCa6RvoosYTs0NG9/view');
            break;
        case 1: // Slide
            await inputTypeFileModule.sendKeys('https://docs.google.com/presentation/d/1t7xEYvgMUMjPXElIbeyJuYpy_RCT-zjbq-hE2Q4ALms/edit?usp=drive_link');
            break;
        case 2: // Video
            await inputTypeFileModule.sendKeys('https://drive.google.com/file/d/1EaWN9_4-JYpADFyuJwtSqWJZ00wmlEfl/view');
            break;
        default: // Gambar
            await inputTypeFileModule.sendKeys('https://drive.google.com/file/d/1Or0hrsJu5myGBe8vqlXje2jY_DmIvH7n/view?usp=drive_link');
            break;
    }
    await driver.sleep(2000);
    await driver.findElement(By.css('.add-file-button')).click();
    let multipleFileItems = await driver.executeScript("return document.querySelectorAll('.multifile-value-container .multifile-item');");
    await thrownAnError("Failed, because value of multiple file is empty or didn't saved properly", await multipleFileItems.length === 0);

    // await driver.executeScript(`
    //     const inputElement = document.querySelector("#selectedCourse input[type='search']");
    //     inputElement.focus();
    //     inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    //     return inputElement;
    // `);

    // await driver.wait(async () => {
    //     let listBoxCourse = await driver.findElement(By.css('#selectedCourse ul'));
    //     return listBoxCourse.isDisplayed();
    // });
    // let listCourse = await driver.executeScript(`return document.querySelectorAll('#selectedCourse ul li')`);
    // await listCourse[faker.number.int({ min: 0, max: await listCourse.length - 1 })].click();


    const dataModule = {
        titleModule,
        descriptionModule,
        multipleFileItems,
        typeCourse
    }
    return dataModule

}

export {
    createData,
}