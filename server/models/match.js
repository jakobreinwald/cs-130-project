// Dependencies
const mongoose = require('mongoose');


// Match schema
const Match = new mongoose.Schema(
    {
        user_a_id: {
            type: Number,
            required: true,
        },
        user_b_id: {
            type: Number,
            required: true,
        },
        match_score: {
            type: Number,
            required: true,
        },
        top_shared_artist_ids: {
            type: [String],
            required: true,
        },
        top_shared_genres: {
            type: [String],
            required: true,
        },
        top_shared_track_ids: {
            type: [String],
            required: true,
        }
    },
    {
        timestamps: true
    }
);

// Export Match model
module.exports = mongoose.model('Match', Match);