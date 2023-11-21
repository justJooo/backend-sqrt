require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/api/sqrt', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const number = parseFloat(req.query.number);
    const client = createClient(
        process.env.SUPABASE_URL ?? '',
        process.env.SUPABASE_KEY ?? '',
        {
            auth: {
                persistSession: false,
            },
        }
    );

    try {
        if (!Number.isFinite(number) || number < 0) {
            return res.status(400).json({
                message: 'Bad Request',
                serverMessage: 'The number must be a positive',
            });
        }
    } catch (error) {
        return res.status(500).json({
            message: 'Internal Server Error',
            serverMessage: error.message,
        });
    }

    const start = performance.now();
    let x = number;
    let y = 1;
    const e = 0.00000001; // accuracy level

    while (x - y > e) {
        x = (x + y) / 2;
        y = number / x;
    }
    const end = performance.now();
    const formattedExecutionTime = (end - start).toFixed(3);

    await client
        .from('calculate_sqrt')
        .insert({
            input: number,
            result: x,
            execution_time: formattedExecutionTime,
            method: 'API',
        })
        .then(
            res.status(201).json({
                message: 'Success',
                data: {
                    input: number,
                    result: x,
                    execution_time: formattedExecutionTime,
                    method: 'API',
                },
            })
        );
});

app.get('/api/plsql/sqrt', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const number = parseFloat(req.query.number);
    const client = createClient(
        process.env.SUPABASE_URL ?? '',
        process.env.SUPABASE_KEY ?? '',
        {
            auth: {
                persistSession: false,
            },
        }
    );
    const { error } = await client.rpc('calculate_sqrt_newton', {
        input: number,
    });

    if (error) {
        res.status(500).send(error.message);
    } else {
        res.status(201).json({
            message: 'Success',
        });
    }
});

const getUserData = async (nim) => {
    const formData = new FormData();
    formData.append('username', nim);

    const response = await axios.post(
        'https://imissu.unud.ac.id/Home/getUserLupaPassword',
        formData
    );
    const html = response.data;

    const extractData = (regex) => {
        const match = html.match(regex);
        return match && match[1];
    };

    return {
        username: extractData(
            /<td width="100px">Username<\/td>.*?<td width="10px">:<\/td>.*?<td>(.*?)<\/td>/s
        ),
        name: extractData(/<td>Name<\/td>.*?<td>:<\/td>.*?<td>(.*?)<\/td>/s),
        email: extractData(/<td>Email<\/td>.*?<td>:<\/td>.*?<td>(.*?)<\/td>/s),
    };
};

app.post('/api/login', async (req, res) => {
    try {
        const userData = await getUserData(req.body.nim);
        const token = jwt.sign(userData, process.env.JWT_SECRET ?? 'mysecret', {
            expiresIn: '1h',
        });

        res.json({
            data: {
                ...userData,
                token: token,
            },
        });
    } catch (err) {
        res.status(400).json({ error: err });
    }
});

app.get('/api/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET ?? 'mysecret',
        function (err, decoded) {
            if (err) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            res.json({ data: decoded });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
