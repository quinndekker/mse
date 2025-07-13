var express = require('express');
var router = express.Router();

router.all("*", (req, res, next) => {
   // console.log("Guarded middleware req.user");
   // console.log(req.user);
   if( req.isAuthenticated() ) {
      return next();
   }
   res.status(401).json({message : "Unauthenticated"});
});

module.exports = router;