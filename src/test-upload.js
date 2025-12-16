
import { ref, uploadString } from 'firebase/storage';
import { storage } from './firebase';

export const runTestUpload = async () => {
    console.log('--- STARTING REST API TEST UPLOAD ---');
    try {
        const bucket = "raidmemegen.firebasestorage.app";
        const filename = `rest_test_${Date.now()}.txt`;
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${filename}`;

        console.log(`Sending POST to: ${url}`);

        // Raw fetch without Auth (Assuming rules might need to be relaxed again for this to work perfectly, 
        // OR we just want to see if we get 412 vs 403).
        // If we get 403 (Forbidden), that is GOOD. It means the server accepted the request but denied auth.
        // If we get 412 (Precondition), the server is rejecting the format/protocol.

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: 'Hello REST API'
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (response.status === 200) {
            alert('REST Upload SUCCESS! The issue is the Firebase SDK.');
        } else if (response.status === 403) {
            alert('REST Upload 403 (Forbidden). This is GOOD! It means the API is working but rules denied access. The 412 is specific to the SDK/Env.');
        } else if (response.status === 412) {
            alert('REST Upload 412. The issue is improperly configured Bucket or Network Proxy.');
        } else {
            alert(`REST Failed: ${response.status} - ${text}`);
        }

    } catch (err) {
        console.error('REST Test Network Error:', err);
        alert(`Network Error: ${err.message}`);
    }
};
