const express = require("express");
require("dotenv").config();
const MongoClient = require('mongodb').MongoClient
var bcrypt = require('bcrypt');
var ObjectId = require('mongodb').ObjectId;

const saltRounds = 12;

let app = express();
const uri = "mongodb+srv://pdsmiley:dUTvtXNXeEuc2bCQ@cluster0.qeaik.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
	if (err) {
		console.error(err)
	}
})

const db = client.db('HackMIT')
const userCollection = db.collection('users')
const homeworkCollection = db.collection("homework")
const lectureCollection = db.collection("lecture")
  
// Cors
const cors = require("cors");
app.use(cors({
	origin: 'http://localhost:3000',
}))

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post("/register", async (req, res) => {
    const { className, email, password } = req.body;
    let errors = [];

    if (!email || !password) {
        errors.push("Please enter all fields");
    }

    if (password.length < 6) {
        errors.push("Password must be at least 6 characters");
    }

    if (errors.length > 0) {
        res.status(400).send(errors);
        return;
    }

	console.log(req.body)


    // Makes sure this email does not already exist in the database
	await userCollection.find({email: email}).toArray()
		.then(users => {
			if (users.length > 0) {
				errors.push({ msg: "Email already exists" });
			}
		})
	
	console.log(1)

	if (errors.length > 0) {
		res.status(400).send(errors);
		return;
	}

    let hashedPassword = "";
    let newUser;
    // let salt;

    // Generates salt for hashing
    // await bcrypt
    //     .genSalt(saltRounds)
    //     .then((s) => {
    //         salt = s;
	// 		console.log(salt)
    //     })
    //     .catch((err) => console.error(err));

	const salt = "$2b$12$r4csBsYVdQDgFwZuYqERCe"

    // Uses the salt to hash the password
    await bcrypt
        .hash(password, salt)
        .then((hash) => {
            hashedPassword = hash;
        })
        .catch((err) => console.error(err));

	await userCollection.insertOne({
			email: email,
			password: hashedPassword,
			classCode: Math.floor(Math.random() * 999999),
			homeworks: [],
			lectures: [],
			className: className,
		}).catch((err) => {
			console.error(err)
		})
		
	console.log(2)

	await userCollection.findOne({email: email})
        .then((res) => {
            if (res) {
                newUser = res;
            } else {
                errors.push("no user found for the given id");
            }
        })
        .catch((err) => {
            console.error(err);
        });
    if (errors.length > 0) {
        res.status(400).send(errors);
        return;
    }
	
    res.status(201).send(newUser);
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let errors = [];
	let user = {}

    if (!email || !password) {
        errors.push("Please enter all fields");
    }

	let hashedPassword = "";
    // let salt;

    // Generates salt for hashing
    // await bcrypt
    //     .genSalt(saltRounds)
    //     .then((s) => {
    //         salt = s;
    //     })
    //     .catch((err) => console.error(err));

	const salt = "$2b$12$r4csBsYVdQDgFwZuYqERCe"

    // Uses the salt to hash the password
    await bcrypt
        .hash(password, salt)
        .then((hash) => {
            hashedPassword = hash;
        })
        .catch((err) => console.error(err));

	console.log(hashedPassword)

    // Makes sure this email does not already exist in the database
	await userCollection.findOne({email: email, password: hashedPassword})
		.then(u => {
			if (u) {
				console.log(u)
				user = u
			}
		})

	if (errors.length > 0) {
		res.status(400).send(errors);
		return;
	}

    res.status(200).send(user);
});

app.get("/user/:userid", async (req, res) => {
    let user;
    let userid = new ObjectId(req.params.userid)
    let errors = [];

    await userCollection.findOne({_id: userid})
        .then((res) => {
            if (res) {
                user = res;
				console.log(res)
            } else {
                errors.push("no user found for the given id");
            }
        })
        .catch((err) => {
            console.error(err);
        });
    if (errors.length > 0) {
        res.status(400).send(errors);
        return;
    }

    res.status(200).send(user);
});

app.post("/create/homework/:userid", async (req, res) => {
	let {questions, title} = req.body
    let errors = [];
    let userid = new ObjectId(req.params.userid)
	let classCode = ""

	await userCollection.findOne({_id: userid})
	.then(res => {
		classCode = res.classCode
	})
	.catch(err => {
		console.error(err)
		errors.push(err)
	})

if (errors.length > 0) {
	res.status(400).send(errors);
	return;
}

	let data = {
		class: userid,
		classCode: classCode,
		questions: questions,
		title: title,
		feedback: [],
	}

	await homeworkCollection.insertOne(data)
		.catch(err => {
			console.error(err)
			errors.push(err)
		})

	if (errors.length > 0) {
		res.status(400).send(errors);
		return;
	}

    res.status(200).send("success");
});

app.post("/create/lecture/:userid", async (req, res) => {
	let {title} = req.body
    let errors = [];
    let userid = new ObjectId(req.params.userid)

	let classCode = ""

	await userCollection.findOne({_id: userid})
	.then(res => {
		classCode = res.classCode
	})
	.catch(err => {
		console.error(err)
		errors.push(err)
	})

	let data = {
		class: userid,
		classCode: classCode,
		title: title, 
		feedback: [],
	}
	

	await lectureCollection.insertOne(data)
		.catch(err => {
			console.error(err)
			errors.push(err)
		})

	if (errors.length > 0) {
		res.status(400).send(errors);
		return;
	}

    res.status(200).send("success");
});

app.post("/feedback/lecture/:lectureId", async (req, res) => {
    let errors = [];
    let lectureId = new ObjectId(req.params.lectureId)

	await lectureCollection.updateOne(
		{ _id:  lectureId },
		{ $push: { feedback: req.body } }
		).catch(err => {
			console.error(err)
			errors.push(err)
		})

	if (errors.length > 0) {
		res.status(400).send(errors);
		return;
	}

    res.status(201).send("success");
});

app.post("/feedback/homework/:homeworkId", async (req, res) => {
    let errors = [];
    let homeworkId = new ObjectId(req.params.homeworkId)

	await homeworkCollection.updateOne(
		{ _id:  homeworkId },
		{ $push: { feedback: req.body } }
		).catch(err => {
			console.error(err)
			errors.push(err)
		})

	if (errors.length > 0) {
		res.status(400).send(errors);
		return;
	}

    res.status(201).send("success");
});

app.get("/feedback/getLectures/:classcode", async (req, res) => {
    let classcode = req.params.classcode

	let lectures = []

	let ltrs = await lectureCollection.find({}, {classCode: classcode}).toArray()
	for (let i = 0; i < ltrs.length; i++) {
		if (ltrs[i].classCode == classcode) {
			lectures.push(ltrs[i])
		}
	}

    res.status(200).send(lectures);
})

app.get("/feedback/getHomeworks/:classcode", async (req, res) => {
    let classcode = req.params.classcode

	let homeworks = []

	let hws = await homeworkCollection.find({}, {classCode: classcode}).toArray()
	for (let i = 0; i < hws.length; i++) {
		if (hws[i].classCode == classcode){
			homeworks.push(hws[i])
		}
	}

    res.status(200).send(homeworks);
})


// Server Start
const PORT = process.env.PORT || 8001;
app.listen(PORT, console.log(`Listening on PORT: ${PORT}`));