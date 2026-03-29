const fs = require('fs');
const file = 'c:/Users/Anay Shah/OneDrive/Desktop/codes/focus-insights/src/components/pages/HomePage.tsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines.splice(120, 4, 
`            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full animate-pulse-ring blur-xl z-0"
              style={{
                width: "280px",
                height: "280px",
                backgroundColor: emotionColors[avatarType] + "33",
              }}
            ></div>
            <Suspense fallback={<div className="opacity-50 text-xs text-center w-full h-full flex items-center justify-center">Loading Avatar...</div>}>
               <Avatar3D />
            </Suspense>`);
fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed HomePage.tsx');
