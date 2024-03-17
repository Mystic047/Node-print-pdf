const express = require('express');
const db = require('./dbConnection');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const ejs = require('ejs'); // Make sure you require ejs

const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Assuming 'public' is directly in your project folder
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const getRows = (sql) => {
  return new Promise((resolve, reject) => {
    db.query(sql, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};



app.get('/empdata', async (req, res) => {
  try {
    const sql = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY EmployeeName) AS 'Order',
      EmployeeName,
      COUNT(*) AS 'จำนวนวัน',
      SUM(CASE WHEN TimeIn > '08:30:00' THEN 1 ELSE 0 END) AS 'มาสายช่วงเช้าเกิน 8:30',
      SUM(CASE WHEN TimeOut < '16:30:00' THEN 1 ELSE 0 END) AS 'ออกงานก่อน 16:30'
    FROM
      combined_file
    WHERE
      Date LIKE '2024-01-%'
    GROUP BY
      EmployeeName
    ORDER BY
      EmployeeName;
    `;
    
    const rows = await getRows(sql);
    res.render('empdata', { employees: rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).send('Error fetching data');
  }
});
  


app.get('/empdata/pdf', async (req, res) => {
  try {
    const sql = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY EmployeeName) AS 'Order',
      EmployeeName,
      COUNT(*) AS 'จำนวนวัน',
      SUM(CASE WHEN TimeIn > '08:30:00' THEN 1 ELSE 0 END) AS 'มาสายช่วงเช้าเกิน 8:30',
      SUM(CASE WHEN TimeOut < '16:30:00' THEN 1 ELSE 0 END) AS 'ออกงานก่อน 16:30'
    FROM
      combined_file
    WHERE
      Date LIKE '2024-01-%'
    GROUP BY
      EmployeeName
    ORDER BY
      EmployeeName;
    `;
    const rows = await getRows(sql);
    ejs.renderFile(path.join(__dirname, 'views', 'empdata.ejs'), { employees: rows }, async (err, html) => {
      if (err) {
        console.error('Error rendering EJS:', err);
        res.status(500).send('Error rendering page');
        return;
      }
      const pdf = await printPDF(html);
      res.contentType('application/pdf');
      res.send(pdf); // Send the PDF buffer to the client
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

async function printPDF(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0'
  });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true
  });
  await browser.close();
  return pdf; // Return the PDF buffer
}



app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
