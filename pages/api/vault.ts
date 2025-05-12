,-[/vercel/path0/pages/api/vault.ts:16:1]
13 |           details: insertError.details,
14 |         });
15 |       
16 | ,->     return res.status(500).json({
17 | |         error: 'Vault creation failed',
18 | |         message: insertError.message,
19 | |         hint: insertError.hint,
20 | |         code: insertError.code,
21 | |         details: insertError.details,
22 | `->     });
23 |       }
   `----
Caused by:
   Syntax Error
Import trace for requested module:
./pages/api/vault.ts
> Build failed because of webpack errors
Error: Command "npm run build" exited with 1
Exiting build container