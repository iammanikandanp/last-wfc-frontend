const fs = require('fs');
const files = ['Members.jsx', 'Payments.jsx', 'Cafeteria.jsx', 'Reports.jsx', 'Expenses.jsx', 'Dashboard.jsx'].map(f => 'c:/Users/ELCOT/Desktop/Fullstack developement/WFC/frontend/src/pages/' + f);

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace grid-cols-2 with grid-cols-1 sm:grid-cols-2
  content = content.replace(/className="([^"]*)grid-cols-2([^"]*)"/g, (match, p1, p2) => {
    if (p1.includes('sm:grid-cols-') || p1.includes('md:grid-cols-') || p2.includes('sm:grid-cols-') || p2.includes('md:grid-cols-')) return match;
    return 'className="' + p1 + 'grid-cols-1 sm:grid-cols-2' + p2 + '"';
  });

  // Replace grid-cols-3 with grid-cols-1 md:grid-cols-3
  content = content.replace(/className="([^"]*)grid-cols-3([^"]*)"/g, (match, p1, p2) => {
    if (p1.includes('sm:grid-cols-') || p1.includes('md:grid-cols-') || p2.includes('sm:grid-cols-') || p2.includes('md:grid-cols-')) return match;
    return 'className="' + p1 + 'grid-cols-1 md:grid-cols-3' + p2 + '"';
  });

  // Replace grid-cols-4 with grid-cols-2 md:grid-cols-4
  content = content.replace(/className="([^"]*)grid-cols-4([^"]*)"/g, (match, p1, p2) => {
    if (p1.includes('sm:grid-cols-') || p1.includes('md:grid-cols-') || p1.includes('lg:grid-cols-') || p2.includes('sm:grid-cols-') || p2.includes('md:grid-cols-')) return match;
    return 'className="' + p1 + 'grid-cols-2 md:grid-cols-4' + p2 + '"';
  });
  
  // Look for any table tags and ensure they are wrapped in an overflow-x-auto container.
  // A simple way is to replace <table with <div className="overflow-x-auto w-full"><table and </table> with </table></div>
  // BUT we must make sure we don't double wrap. Let's do that manually.
  fs.writeFileSync(file, content);
});
console.log('Fixed grid cols');
