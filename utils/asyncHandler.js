const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}
// Helper function to convert duration to days
// const convertDurationToDays = (durationStr) => {
//     const match = durationStr.match(/(\d+(\.\d+)?)\s*month/);
//     if (match) {
//         const durationValue = parseFloat(match[1]);
//         return durationValue * 30; // Convert months to days (approximate)
//     }
//     return null;
// };
const convertDurationToDays = (durationStr) => {
    console.log(durationStr,"durationStr")
    if (!durationStr) {
        return null;
    }
    const match = durationStr.match(/(\d+(\.\d+)?)\s*month/);
    if (match) {
        const durationValue = parseFloat(match[1]);
        return durationValue * 30; // Convert months to days (approximate)
    }
    return null;
};
module.exports= { asyncHandler ,convertDurationToDays}
// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }