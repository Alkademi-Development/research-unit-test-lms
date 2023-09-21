const TEST_NEED_AUTHENTICATION = [
    'login', 'logout', 'dashboard', 'classroom', 'course', 'user', 'authentication'
    // 'dashboard/classroom',
    // 'dashboard/course',
    // 'dashboard/user',
    // 'dashboard/event',
    // 'authentication',
];

const TEST_WITHOUT_AUTHENTICATION = [
    'authentication'
]

const TEST_NEED_ID_OR_SLUG = ['create', 'edit', 'update', 'delete'];

export {
    TEST_NEED_AUTHENTICATION,
    TEST_WITHOUT_AUTHENTICATION,
    TEST_NEED_ID_OR_SLUG
}