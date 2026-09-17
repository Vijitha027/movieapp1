console.log("Program started");

var express = require('express');
var app = express();

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var session = require('express-session');

var config = require('./config/config.js');

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'movieappsecret',
    resave: false,
    saveUninitialized: false
}));

var db;

const url = config.connect.dbConnectString;

console.log("MongoDB connection started");

MongoClient.connect(url)
    .then(function(database) {

        console.log("MongoDB connected");

        db = database.db('movieapp');

        app.listen(config.connect.port, function() {
            console.log("Listening to port # " + config.connect.port);
            console.log("Localhost link: http://localhost:" + config.connect.port);
        });

    })
    .catch(function(err) {
        console.log("MongoDB connection error:", err);
    });



app.get('/', function(req, res) {
    res.redirect('/login');
});




app.get('/register', function(req, res) {
    res.render('register');
});




app.post('/register', function(req, res) {

    var username = req.body.username.trim();
    var password = req.body.password;

    if (username === '' || password === '') {
        return res.send('Username and password are required');
    }

    db.collection('users').findOne({
        username: username
    })
    .then(function(existingUser) {

        if (existingUser) {
            return res.send('Username already exists');
        }

        return db.collection('users').insertOne({
            username: username,
            password: password,
            role: 'user',
            bookmarks: []
        });

    })
    .then(function(result) {

        if (result) {
            res.redirect('/login');
        }

    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/login', function(req, res) {
    res.render('login');
});



app.post('/login', function(req, res) {

    db.collection('users').findOne({
        username: req.body.username,
        password: req.body.password,
        role: 'user'
    })
    .then(function(user) {

        if (!user) {
            return res.send('Invalid username or password');
        }

        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            role: user.role
        };

        res.redirect('/usermovies');

    })
    .catch(function(err) {
        res.send(err);
    });

});



app.get('/logout', function(req, res) {

    req.session.destroy(function() {
        res.redirect('/login');
    });

});




app.get('/admin', function(req, res) {

    db.collection('movies').find().toArray()
        .then(function(movies) {

            res.render('index', {
                movies: movies
            });

        })
        .catch(function(err) {
            res.send(err);
        });

});



app.get('/movies', function(req, res) {

    db.collection('movies').find().toArray()
        .then(function(movies) {

            res.render('index', {
                movies: movies
            });

        })
        .catch(function(err) {
            res.send(err);
        });

});



app.get('/addmovie', function(req, res) {
    res.render('addmovie');
});




app.post('/addmovie', function(req, res) {

    db.collection('movies').insertOne({
        title: req.body.title,
        year: Number(req.body.year),
        genre: req.body.genre,
        description: req.body.description,
        image: req.body.image
    })
    .then(function() {
        res.redirect('/admin');
    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/edit/:id', function(req, res) {

    db.collection('movies').findOne({
        _id: new ObjectId(req.params.id)
    })
    .then(function(movie) {

        if (!movie) {
            return res.send('Movie not found');
        }

        res.render('editmovie', {
            movie: movie
        });

    })
    .catch(function(err) {
        res.send(err);
    });

});



app.post('/edit/:id', function(req, res) {

    db.collection('movies').updateOne(
        {
            _id: new ObjectId(req.params.id)
        },
        {
            $set: {
                title: req.body.title,
                year: Number(req.body.year),
                genre: req.body.genre,
                description: req.body.description,
                image: req.body.image
            }
        }
    )
    .then(function() {
        res.redirect('/admin');
    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/delete/:id', function(req, res) {

    db.collection('movies').deleteOne({
        _id: new ObjectId(req.params.id)
    })
    .then(function() {
        res.redirect('/admin');
    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/usermovies', function(req, res) {

    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/login');
    }

    db.collection('movies').find().toArray()
        .then(function(movies) {

            res.render('usermovies', {
                movies: movies,
                username: req.session.user.username
            });

        })
        .catch(function(err) {
            res.send(err);
        });

});



app.get('/movie/:id', function(req, res) {

    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/login');
    }

    db.collection('movies').findOne({
        _id: new ObjectId(req.params.id)
    })
    .then(function(movie) {

        if (!movie) {
            return res.send('Movie not found');
        }

        return db.collection('reviews').find({
            movieId: movie._id
        }).toArray()
        .then(function(reviews) {

            res.render('moviedetails', {
                movie: movie,
                reviews: reviews,
                username: req.session.user.username
            });

        });

    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/bookmark/:id', function(req, res) {

    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/login');
    }

    db.collection('users').updateOne(
        {
            _id: new ObjectId(req.session.user.id)
        },
        {
            $addToSet: {
                bookmarks: new ObjectId(req.params.id)
            }
        }
    )
    .then(function() {
        res.redirect('/usermovies');
    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/remove-bookmark/:id', function(req, res) {

    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/login');
    }

    db.collection('users').updateOne(
        {
            _id: new ObjectId(req.session.user.id)
        },
        {
            $pull: {
                bookmarks: new ObjectId(req.params.id)
            }
        }
    )
    .then(function() {
        res.redirect('/bookmarks');
    })
    .catch(function(err) {
        res.send(err);
    });

});




app.get('/bookmarks', function(req, res) {

    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/login');
    }

    db.collection('users').findOne({
        _id: new ObjectId(req.session.user.id)
    })
    .then(function(user) {

        var bookmarkIds = user.bookmarks || [];

        return db.collection('movies').find({
            _id: {
                $in: bookmarkIds
            }
        }).toArray();

    })
    .then(function(movies) {

        res.render('bookmarks', {
            movies: movies,
            username: req.session.user.username
        });

    })
    .catch(function(err) {
        res.send(err);
    });

});




app.post('/review/:id', function(req, res) {

    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/login');
    }

    var rating = Number(req.body.rating);
    var reviewText = req.body.review;

    if (rating < 1 || rating > 5) {
        return res.send('Rating must be between 1 and 5');
    }

    db.collection('reviews').insertOne({
        movieId: new ObjectId(req.params.id),
        username: req.session.user.username,
        rating: rating,
        review: reviewText,
        date: new Date()
    })
    .then(function() {
        res.redirect('/movie/' + req.params.id);
    })
    .catch(function(err) {
        res.send(err);
    });

});