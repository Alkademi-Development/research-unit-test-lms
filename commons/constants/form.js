import { faker } from "@faker-js/faker";

const QUESTIONS = [
    {
        limitTime: faker.number.int({ min: 3, max: 10 }),
        formStats: faker.datatype.boolean(),
        title: "Algoritma Fundemental",
        description: "",
        formType: "basic",
        isNotifyEmail: faker.datatype.boolean(),
        emailNotif: "adnanerlansyah505@gmail.com",
        questions: [
            {
                question: 'Apa itu algoritma ?',
                required: faker.datatype.boolean(),
            },
            {
                question: 'Apa fungsi algoritma ?',
                required: faker.datatype.boolean(),
            },
            {
                question: 'Siapa pembuat / penemu metode algoritma ?',
                required: faker.datatype.boolean(),
            },
            {
                question: 'Di temukan pada tahun berapakah metode algoritma ?',
                required: faker.datatype.boolean(),
            },
        ],
    },
    {
        limitTime: faker.number.int({ min: 3, max: 10 }),
        formStats: faker.datatype.boolean(),
        title: "Teknologi Greentech",
        description: "",
        formType: "basic",
        isNotifyEmail: faker.datatype.boolean(),
        emailNotif: "adnanerlansyah505@gmail.com",
        questions: [
            {
                question: 'Apa yang di maksud dengan teknologi greentech ?',
                required: faker.datatype.boolean(),
            },
            {
                question: 'Sebutkan perusahaan apa saja yang termasuk ke dalam category yang menggunakan Teknologi Greentech',
                required: faker.datatype.boolean(),
            },
            {
                question: 'Apakah teknologi greentech ini aman untuk lingkungan sekitar, sebutkan alasan nya',
                required: faker.datatype.boolean(),
            },
        ],
    },
    {
        limitTime: faker.number.int({ min: 3, max: 10 }),
        formStats: faker.datatype.boolean(),
        title: "Pseudocode",
        description: "",
        formType: "quiz",
        isNotifyEmail: faker.datatype.boolean(),
        emailNotif: "adnanerlansyah505@gmail.com",
        questions: [
            {
                question: 'Apa itu pseudocode ?',
                required: faker.datatype.boolean(),
                options: [
                  {
                    value: 'Pseudocode adalah cara untuk menjabarkan suatu algoritma secara runut',
                    isCorrect: true,
                  },
                  {
                    value: 'Tidak Tahu',
                    isCorrect: false,
                  },
                ]
            }
        ],
    },
    {
        limitTime: faker.number.int({ min: 3, max: 10 }),
        formStats: faker.datatype.boolean(),
        title: "Budibase",
        description: "",
        formType: "quiz",
        isNotifyEmail: faker.datatype.boolean(),
        emailNotif: "adnanerlansyah505@gmail.com",
        questions: [
            {
                question: 'Apa itu Budibase Data ?',
                required: faker.datatype.boolean(),
                options: [
                  {
                    value: 'Budibase Data adalah sebuah halaman yang mengatur bagian pengelolaan data di database agar bisa di tampilkan di halaman depan nya',
                    isCorrect: true,
                  },
                  {
                    value: 'Hanya sekumpulan data',
                    isCorrect: false,
                  },
                ]
            },
            {
                question: 'Apa itu Budibase Design ?',
                required: faker.datatype.boolean(),
                options: [
                  {
                    value: 'Budibase Design adalah sebuah halaman yang mengatur / men-design bagian depan atau tampilan yang akan di lihat oleh user',
                    isCorrect: true,
                  },
                  {
                    value: 'Mempercantik halaman',
                    isCorrect: false,
                  },
                ]
            },
        ],
    },
    {
        limitTime: faker.number.int({ min: 3, max: 10 }),
        formStats: faker.datatype.boolean(),
        title: "HTML",
        description: "",
        formType: "quiz",
        isNotifyEmail: faker.datatype.boolean(),
        emailNotif: "adnanerlansyah505@gmail.com",
        questions: [
            {
                question: 'Apa itu HTML ?',
                required: faker.datatype.boolean(),
                options: [
                  {
                    value: 'Hyper Text Markup Language, adalah sebuah text markup yang berfungsi agar bisa membuat element-element yang bisa menjadi sebuah kerangka tampilan',
                    isCorrect: true,
                  },
                  {
                    value: 'Adalah bahasa pemograman',
                    isCorrect: false,
                  },
                ]
            },
            {
                question: 'Apa fungsi DOCTYPE pada html ?',
                required: faker.datatype.boolean(),
                options: [
                  {
                    value: 'Mengindikasikan bahwa versi html yang ingin di pakai adalah versi 5',
                    isCorrect: true,
                  },
                  {
                    value: 'Hanya keyword biasa saja',
                    isCorrect: false,
                  },
                ]
            },
        ],
    },
]

export {
    QUESTIONS
}