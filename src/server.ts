require('rootpath')();
/* Required imports */
import express, { Application, Request, Response, NextFunction, Router } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import fs from 'fs';

/* Declaration merging on express-session*/
declare module "express-session" {
    interface Session {
      userId: number;
    }
}

/* options object with corsOptions type for configuring cors*/
const options: cors.CorsOptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'x-xsrf-token'
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: '*',
    preflightContinue: false,
};

const router: Router = express.Router();
const app: Application = express();

app.use(
    session({ secret: 'thisismysecrctekey', saveUninitialized: true, resave: true })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors(options));

app.use('/', router);

app.listen(process.env.PORT || 3000, () => {
    console.log(`App Started on PORT ${process.env.PORT || 3000}`);
});

/* User Data */

const users = [
  {id:1, name:'Alex', email:'alex@gmail.com', password: 'secret'},
  {id:2, name:'Glen', email:'glen@gmail.com', password: 'secret'},
  {id:1, name:'Max', email:'max@gmail.com', password: 'secret'}
];

/* Function to check session for authentication of the user */
const redirectLogin = (req: Request,res: Response, next: NextFunction) => {
  if(!req.session.userId){
    console.log('Access denied!');
    res.redirect('/login')
  } else {
    console.log('Unauthorised access!');
    next()
  }
}

const redirectHome = (req: Request,res: Response, next: NextFunction) => {
  if(req.session.userId){
    res.redirect('/home')
  } else {
    next()
  }
}

router.get('/', (req: Request,res: Response) => {
  const {userId} = req.session;

  res.send(`
  <h1>Welcome!</h1>
  ${userId ? `<a href='/home'>Home</a>
  <form method='post' action='/logout'>
  <button>Logout</button>
  </form>` : 
  ` <a href='/login'>Login</a>
  <a href='/register'>Register</a>`}
  `)
});

router.get('/home', redirectLogin, (req: Request,res: Response) => {
  const user = users.find(user => user.id === req.session.userId);
  
  res.send(`
  <h1>Home</h1>
  <a href='/'>Main</a>
  <ul>
    <li>Name: ${user?.name}</li>
    <li>Email: ${user?.email}</li>
  </ul>
  <a href='/api/proxy/123'>API path</a>
  <a href='/pub/proxy/123'>PUB path</a>

  <a href='/logout'>Logout</a>
  `)
});

router.get('/login', redirectHome, (req: Request,res: Response) => {

  res.send(`
  <h1>Login</h1>
  <form method='post' action='/login'>
  <input type='email' name='email' placeholder='Email' require/>
  <input type='password' name='password' placeholder='Password' require/>
  <input type='submit' />
  </form>
  <a href='/register'>Register</a>
  `)
});

router.get('/register', redirectHome, (req: Request,res: Response) => {

  res.send(`
  <h1>Register</h1>
  <form method='post' action='/register'>
  <input name='name' placeholder='Name' require/>
  <input type='email' name='email' placeholder='Email' require/>
  <input type='password' name='password' placeholder='Password' require/>
  <input type='submit' />
  </form>
  <a href='/login'>Login</a>
  `)
});

router.post('/login', redirectHome, (req: Request,res: Response) => {
  const {email, password} = req.body;

  if(email && password){
    const user = users.find(user => user.email === email && user.password === password)

    if(user){
      req.session.userId = user.id;
      return res.redirect('/home');
    }
  }

  res.redirect('/login');
});

router.post('/register', redirectHome, (req: Request,res: Response) => {
  const {name, email, password} = req.body;

  if(name && email && password){
    const exists = users.some(user => user.email === email)

    if(!exists){
      const user = {
        id: users.length + 1,
        name,
        email, 
        password
      }
      users.push(user);
      req.session.userId = user.id;

      return res.redirect('/home');
    }
  }

  res.redirect('/register');
});

router.get('/logout', redirectLogin, (req: Request,res: Response) => {
  req.session.destroy(err => {
    if(err){
      return res.redirect('/home')
    }
    res.redirect('/login');
  });
});

router.get('/api/proxy/*', redirectLogin, (req: Request,res: Response, next: NextFunction) => {
  const user = users.find(user => user.id === req.session.userId);

  res.send(`
  <h1>Hi ${user?.name}, You are accessing api/proxy path</h1>
  <a href='/home'>Home</a>
  <a href='/logout'>Logout</a>
  `)
});
  
router.get('/pub/proxy/*', redirectLogin, (req: Request,res: Response, next: NextFunction) => {
  const user = users.find(user => user.id === req.session.userId);

  res.send(`
  <h1>Hi ${user?.name}, You are accessing pub/proxy path</h1>
  <a href='/home'>Home</a>
  <a href='/logout'>Logout</a>
  `)
});
  
const filePath = `${__dirname}/store`;

router.post('/save/:id', function (req: Request,res: Response) {
    if (!fs.existsSync(`${filePath}`)) {
      fs.mkdirSync(`${filePath}`);
    }

    let writeStream = fs.createWriteStream( `${filePath}/${req.params.id}.json`);

    // To write the content
    writeStream.write( JSON.stringify(req.body));

    // the finish event is emitted when all data has been flushed from the stream
    writeStream.on('finish', () => {
      console.log('File created successfully');
      res.send('File created SuccessFully')
    });

    // This is here incase any errors occur
    writeStream.on('error', function (err) {
      console.log(err);
      res.send(err)
    });

    // close the stream
    writeStream.end();

});
  
router.get('/save/:id', (req: Request,res: Response, next: NextFunction) => {
  //Reading the data
    let result = fs.readFileSync(`${filePath}/${req.params.id}.json`);
    res.json(JSON.parse(result.toString()));
});