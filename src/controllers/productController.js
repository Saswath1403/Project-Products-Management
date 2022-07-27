const productModel = require("../models/productModel");
const cartModel = require("../models/cartModel")
const aws = require("../aws/s3")
const jwt = require("jsonwebtoken");
const { objectValue, keyValue, isValidISBN, isValidArray, numberValue, isValidDate, isValidObjectId, strRegex, urlRegex, booleanValue } = require("../middleware/validator")  // IMPORTING VALIDATORS

//------------------------------------------------------  FIFTH API  --------------------------------------------------------------\\

// V = Validator 

const createProduct = async (req, res) => {

  try {
    const { title, description, price, currencyId, currencyFormat, isFreeShipping, availableSizes, style, installments, isDeleted } = req.body  // Destructuring

    if (!keyValue(req.body)) return res.status(400).send({ status: false, msg: "Please provide details!" })  // 3rd V used here

    //upload book cover(a file) by aws
    let files = req.files
    let uploadFileURL;
    if (files && files.length > 0) {
      uploadFileURL = await aws.uploadFile(files[0])
    }
    else {
      return res.status(400).send({ status: false, message: "Please add profile image" })
    }
    //aws-url
    let productImage = uploadFileURL

    if (!objectValue(title)) return res.status(400).send({ status: false, msg: "Please enter title!" })  // 2nd V used here

    let duplicateTitle = await productModel.findOne({ title })        // DB Call
    if (duplicateTitle) return res.status(400).send({ status: false, msg: "title is already in use!" })   // Duplicate Validation

    if (!objectValue(description)) return res.status(400).send({ status: false, msg: "Please enter description!" })  // 2nd V used here


    if (!price) return res.status(400).send({ status: false, msg: "Please enter price!" })
    // 2nd V used here
    if (price) {
     if (!numberValue(price)) return res.status(400).send({ status: false, msg: "Please enter price!" })
    }

    if (currencyId) {
      if (!objectValue(currencyId)) return res.status(400).send({ status: false, msg: "Please enter currencyId!" })
    }  // 2nd V used here

    if (currencyFormat) {
      if (!objectValue(currencyFormat)) return res.status(400).send({ status: false, msg: "Please enter currencyFormat!" })
    }  // 2nd V used here

    if (isFreeShipping || isFreeShipping === "") { if (!booleanValue(isFreeShipping)) return res.status(400).send({ status: false, msg: "Please enter isFreeShipping!" }) }  // 2nd V used here


    // Validation For availableSizes
    let availableSize
    if (availableSizes) {
      availableSize = availableSizes.toUpperCase().split(",")
      console.log(availableSize);  // Creating an array

      //  Enum validation on availableSizes
      for (let i = 0; i < availableSize.length; i++) {
        if (!(["S", "XS", "M", "X", "L", "XXL", "XL"]).includes(availableSize[i])) {
          return res.status(400).send({ status: false, message: `Sizes should be ${["S", "XS", "M", "X", "L", "XXL", "XL"]}` })
        }
      }
    }

    if (style) {
      if (!objectValue(style)) return res.status(400).send({ status: false, msg: "Please enter style!" })
    }  // 2nd V used here

    if (installments === "") {
      if (!numberValue(installments)) return res.status(400).send({ status: false, msg: "Please enter installments!" })
    }   // 2nd V used here

    if (isDeleted === true || isDeleted === "") return res.status(400).send({ status: false, msg: "isDeleted must be false!" })  // Boolean Validation

    const products = { title, description, price, currencyId, currencyFormat, isFreeShipping, productImage, availableSizes: availableSize, style, installments, isDeleted }

    const productCreation = await productModel.create(products)

    res.status(201).send({ status: true, message: 'Success', data: productCreation })

  } catch (error) {
    res.status(500).send({ status: false, msg: error.message });
  }
};




//-----------------------------------------------------  [SIXTH API]  ---------------------------------------------------------------\\

const getProducts = async (req, res) => {
  try {
    const productQuery = req.query;
    const filter = { isDeleted: false };          // Object Manupulation
    const { size, name, priceGreaterThan, priceLessThan } = productQuery;       // Destructuring          

   if (objectValue(size)) {               // 2nd V used here
      const sizeArray = size.trim().split(",").map((s) => s.trim())
      filter.availableSizes = { $all: sizeArray } // The $all operator selects the documents where the value of a field is an array that contains all the specified elements.
    };

    if (name) {                // Nested If Else used here
      if (!objectValue(name)) { return res.status(400).send({ status: false, msg: "Product name is invalid!" }) }  // 2nd V used here
      else { filter.title = name };
    }

    if (priceGreaterThan || priceLessThan ) {                // Nested If Else used here
      if (!objectValue(priceGreaterThan)) { return res.status(400).send({ status: false, msg: "priceGreaterThan is invalid!" }) }  // 2nd V used here
      if (!objectValue(priceLessThan)) { return res.status(400).send({ status: false, msg: "priceLessThan is invalid!" }) }  // 2nd V used here
      else { filter.price = {price:[{$gt:priceGreaterThan, $lt:priceLessThan}]}  
      // db.inventory.find( { $or: [ { quantity: { $lt: 20 } }, { price: 10 } ] } )
      // { field: { $in: [<value1>, <value2>, ... <valueN> ] } }
    };
    } 

    // if (priceLessThan) {                // Nested If Else used here
    //   if (!objectValue(priceLessThan)) { return res.status(400).send({ status: false, msg: "Product name is invalid!" }) }  // 2nd V used here
    //   else { filter.price = {$lt:priceLessThan} };
    // }  
    
    const productList = await productModel.find(filter).sort({price: 1})

    if (productList.length === 0) return res.status(400).send({ status: false, msg: "no product found!" })  // DB Validation

    res.status(200).send({ status: true, message: 'Product list', data: productList })

  }
  catch (error) {
    res.status(500).send({ status: false, msg: error.message });
  }
};

//----------------------------------------------------  [SEVENTH API]  --------------------------------------------------------------\\

const getBooksbyId = async (req, res) => {

  const bookId = req.params.bookId

  if (!isValidObjectId(bookId)) { return res.status(400).send({ status: false, msg: "bookId is invalid!" }) }    // 1st V used here

  const findBooksbyId = await booksModel.findOne({ _id: bookId, isDeleted: false })     // DB Call
  if (!findBooksbyId) { return res.status(404).send({ status: false, msg: "Books not found or does not exist!" }) }   // DB Validation

  const reviews = await reviewModel.find({ bookId: bookId })        // DB Call

  res.status(200).send({ status: true, message: 'Books list', data: findBooksbyId, reviewsData: reviews })

}


//----------------------------------------------------  [EIGHTH API] ---------------------------------------------------------------\\



const updateBooks = async function (req, res) {
  try {
    const bookId = req.params.bookId;

    if (!isValidObjectId(bookId)) return res.status(400).send({ status: false, msg: "bookId is invalid!" })   // 1st V used here

    const findBooksbyId = await booksModel.findOne({ _id: bookId, isDeleted: false })            // DB Call
    if (!findBooksbyId) { return res.status(404).send({ status: false, msg: "Books not found or does not exist!" }) }

    let token = req.headers["x-api-key"]
    let decodedToken = jwt.verify(token, "group66-project3")            // Authorization
    if (findBooksbyId.userId != decodedToken.userId) { return res.status(403).send({ status: false, msg: "not authorized!" }) }

    const { title, excerpt, releasedAt, ISBN } = req.body;  // Destructuring

    if (!keyValue(req.body)) return res.status(400).send({ status: false, msg: "Please provide something to update!" }); // 3rd V used here

    if (!(title || excerpt || releasedAt || ISBN)) return res.status(400).send({ status: false, msg: "Please input valid params to update!" });

    if (title || title === "") {          // Nested If used here
      if (!objectValue(title)) return res.status(400).send({ status: false, msg: "Please enter title!" })
    }        // 2nd V used above

    let duplicateTitle = await booksModel.findOne({ title })
    if (duplicateTitle) return res.status(400).send({ status: false, msg: "title is already in use!" })    // Duplicate Validation

    if (excerpt || excerpt === "") {       // Nested If used here
      if (!objectValue(excerpt)) return res.status(400).send({ status: false, msg: "Please enter excerpt!" })
    }        // 2nd V used above

    if (releasedAt || releasedAt === "") {    // Nested If used here
      if (!objectValue(releasedAt)) return res.status(400).send({ status: false, msg: "Please enter releasedAt!" }) // 2nd V used here
      if (!isValidDate(releasedAt)) return res.status(400).send({ status: false, msg: "Please enter releasedAt in the right format(YYYY-MM-DD)!" })      // 16th V used above 
    }

    if (ISBN || ISBN === "") {
      if (!isValidISBN(ISBN)) return res.status(400).send({ status: false, message: 'Please provide a valid ISBN of 13 digits!' })
    }     // 12th V used above

    let duplicateISBN = await booksModel.findOne({ ISBN })    // DB Call
    if (duplicateISBN) return res.status(400).send({ status: false, msg: "ISBN is already registered!" })  // Duplicate Validation

    const updatedBooks = await booksModel.findOneAndUpdate(
      { _id: bookId },
      { $set: { title, excerpt, releasedAt, ISBN } },
      { new: true }
    );
    return res.status(200).send({ status: true, message: 'Success', data: updatedBooks });

  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};

//------------------------------------------------------  SEVENTH API  ------------------------------------------------------------------\\

const deleteBooksbyId = async (req, res) => {

  try {
    const bookId = req.params.bookId

    if (!isValidObjectId(bookId)) { return res.status(400).send({ status: false, msg: "bookId is invalid!" }) }   // 1st V used here

    const findBooksbyId = await booksModel.findOne({ _id: bookId, isDeleted: false })    // DB Call
    if (!findBooksbyId) { return res.status(404).send({ status: false, msg: "Books not found or does not exist!" }) }

    let token = req.headers["x-api-key"]
    let decodedToken = jwt.verify(token, "group66-project3")          // Authorization
    if (findBooksbyId.userId != decodedToken.userId) { return res.status(403).send({ status: false, msg: "not authorized!" }) }

    await booksModel.findOneAndUpdate(
      { _id: bookId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true })

    res.status(200).send({ status: true, message: "Book deleted successfully!" })
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
}


module.exports = { createProduct, getProducts, getBooksbyId, updateBooks, deleteBooksbyId }  // Destructuring & Exporting
