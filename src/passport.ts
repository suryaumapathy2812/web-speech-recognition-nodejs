require('dotenv').config();
import passport from 'passport';
import passport_google_oauth20 from 'passport-google-oauth20';


const GoogleStrategy = passport_google_oauth20.Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  callbackURL: "http://localhost:3000/auth/google/callback",
  // accessType: 'offline',
},
  function (accessToken: string, refreshToken: string, profile: any, cb: any) {
    // Store accessToken in the user object
    let user = {
      profile: profile,
      accessToken: accessToken,
      refreshToken: refreshToken // if you need the refresh token as well
    };
    return cb(null, user);
  }
));

passport.serializeUser(function (user: any, cb: any) {
  cb(null, user);
});

passport.deserializeUser(function (obj: any, cb: any) {
  cb(null, obj);
})

export default passport;