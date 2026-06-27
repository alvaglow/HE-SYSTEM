LOCAL DEVELOPMENT GUIDE
========================

If you see "This site can't be reached" when visiting localhost:3000,
you need to start the Next.js development server.

HOW TO START THE SERVER
------------------------

Step 1: Open Terminal
   1. Press Windows key
   2. Type: cmd
   3. Press Enter

Step 2: Navigate to the web app
   Type this command and press Enter:

      cd "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM\apps\web"

Step 3: Start the server
   Type this command and press Enter:

      npm run dev

Step 4: Wait for the server to start
   You should see text similar to this:

      > @he-system/web@0.1.0 dev
      > next dev

      ready - started server on 0.0.0.0:3000, url: http://localhost:3000

Step 5: Open your browser
   Go to: http://localhost:3000
   You should now see the HE System homepage!

IMPORTANT
----------

Keep the Command Prompt window open!
If you close it, the server stops.

The server must be running for the website to work.
It is like turning on the engine of a car.

LOCALHOST NOT WORKING?
-----------------------

If you still see "This site can't be reached":

1. Check if the server is running
   Look at the Command Prompt window.
   You should see: "ready - started server on 0.0.0.0:3000"
   If you don't see this, the server is not running.

2. Try a different port
   Sometimes port 3000 is already in use.
   Try running this command instead:

      npm run dev -- --port 3000

   Or try a different port:

      npm run dev -- --port 3001

   Then visit: http://localhost:3001

3. Check for errors
   Look at the Command Prompt window.
   If you see red text, that is an error.
   Screenshot the error and share it.

4. Make sure dependencies are installed
   In the Command Prompt window, type:

      npm install

   Then try starting the server again.

5. Restart your computer
   Sometimes a simple restart fixes connection issues.

DEPLOY TO VERCEL INSTEAD
--------------------------

Running locally is good for testing, but for others to see your website,
it must be hosted (deployed) on a server.

Vercel is the best option because it is automatic and free.

See VERCEL-GUIDE.md for step-by-step instructions.
