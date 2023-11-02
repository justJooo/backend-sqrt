require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/api', async (req, res) => {
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

app.get('/plsql', async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
