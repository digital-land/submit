import express from 'express'
const router = express.Router();

router.get('/lpa-overview', (req, res) => {
    res.render('manage/lpa-overview.html', {})
});

export default router
