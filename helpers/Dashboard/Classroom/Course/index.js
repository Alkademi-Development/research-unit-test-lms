import pkg from 'selenium-webdriver';
const { By, until } = pkg;
import { faker } from '@faker-js/faker';


async function createData(driver) {

    // Aksi mendapatkan semua element input
    let titleCourse = await driver.findElement(By.id('Judul Materi *'));
    let descriptionCourse = await driver.findElement(By.id('Deskripsi Materi *'));
    let standardPassedCourse = await driver.findElement(By.id('Standar Kelulusan *'));
    let typeCourse = await driver.findElement(By.id('Tipe *'));

    // Aksi mengisi semua form element input
    await titleCourse.sendKeys(faker.lorem.words(3));
    await driver.sleep(3000);
    await descriptionCourse.sendKeys(faker.lorem.sentences(5))
    await driver.sleep(3000);
    await standardPassedCourse.sendKeys(faker.number.int({ min: 70, max: 100 }))
    await driver.sleep(3000);
    await typeCourse.sendKeys(faker.helpers.arrayElement(['module', 'pretest']));
    await driver.sleep(3000);
    
    const dataModule = {
        titleCourse,
        descriptionCourse,
        standardPassedCourse,
        typeCourse
    }
    return dataModule

}


async function editData(driver) {

    // Aksi mendapatkan semua element input
    let titleCourse = await driver.findElement(By.id('Judul Materi *'));
    await driver.sleep(3000);
    let descriptionCourse = await driver.findElement(By.id('Deskripsi Materi *'));
    await driver.sleep(3000);
    let standardPassedCourse = await driver.findElement(By.id('Standar Kelulusan *'));
    await driver.sleep(3000);
    let typeCourse = await driver.findElement(By.id('Tipe *'));
    await driver.sleep(3000);

    // Aksi mengisi semua form element input
    await titleCourse.clear()
    await titleCourse.sendKeys(faker.lorem.words(3));
    await descriptionCourse.clear()
    await descriptionCourse.sendKeys(faker.lorem.sentences(5))
    
    const dataModule = {
        titleCourse,
        descriptionCourse,
    }

    return dataModule

}

export {
    createData,
    editData
}