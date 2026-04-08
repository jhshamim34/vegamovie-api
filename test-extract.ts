import fs from "fs";

async function testExtract() {
  const url = "https://fastdl.zip/api/download?id=axHxmiwFJxzWfRfpBl0qPKaSH";
  console.log("Fetching:", url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response:", text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}

testExtract();
