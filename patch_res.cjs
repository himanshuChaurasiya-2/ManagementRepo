const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/leadController.ts', 'utf8');

code = code.replace(
  'message: "My leads fetched successfully",',
  'success: true,\n      message: "My leads fetched successfully",'
);

code = code.replace(
  'message: "All leads fetched successfully",',
  'success: true,\n      message: "All leads fetched successfully",'
);

fs.writeFileSync('backend/src/controllers/leadController.ts', code, 'utf8');
console.log('PATCHED_RESPONSES');
