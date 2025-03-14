const Role = require('../modals/roleModel');
const superAdminPermissions = [
  { resource: 'users', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny'] },
  { resource: 'category', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny']},
  { resource: 'subcategory', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny']},
  { resource: 'courses', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny']},
  { resource: 'lectures', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny']},
  { resource: 'videos', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny']},
  { resource: 'enrollment', actions: ['createAny', 'readAny', 'updateAny', 'deleteAny']}
];
const adminPermissions = [
  { resource: 'category', actions: ['readAny', 'updateAny'] },
  { resource: 'subcategory', actions: ['readAny', 'updateAny'] },
  { resource: 'courses', actions: ['readAny', 'updateAny'] },
  { resource: 'lectures', actions: ['readAny', 'updateAny'] },
  { resource: 'videos', actions: ['readAny', 'updateAny'] },
  { resource: 'enrollment', actions: ['readAny', 'updateAny'] }
];
const userPermissions = [
  { resource: 'courses', actions: ['readAny', 'enroll'] },
  { resource: 'lectures', actions: ['readAny', 'complete'] },
  { resource: 'enrollment', actions: ['enroll', 'assign'] }
];
const studentPermissions = [
  { resource: 'videos', actions: ['readAny'] },
  { resource: 'lectures', actions: ['readAny', 'complete'] }
];
const teacherPermissions = [
  { resource: 'videos', actions: ['uploadOwn', 'updateOwn', 'readAny'] },
  { resource: 'lectures', actions: ['createAny', 'updateOwn', 'creatLecture']}
];
const roles = [
  { name: 'superadmin', permissions: superAdminPermissions },
  { name: 'admin', permissions: adminPermissions },
  { name: 'user', permissions: userPermissions },
  { name: 'student', permissions: studentPermissions },
  { name: 'teacher', permissions: teacherPermissions }
];
const setupRoles = async () => {
  return Promise.all(roles.map(roleData => 
    Role.findOneAndUpdate({ name: roleData.name }, roleData, { upsert: true, new: true })
  ));
};
module.exports = setupRoles;
