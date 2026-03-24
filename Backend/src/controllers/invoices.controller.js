import * as invoicesService from '../services/invoices.service.js'
import * as invoiceNumbersService from '../services/invoiceNumbers.service.js'

export async function send(req, res) {
  const result = await invoicesService.sendInvoice(req.ctx, req.params.invoiceNumber)
  return res.json(result)
}

export async function nextNumber(req, res) {
  const result = await invoiceNumbersService.nextNumber(req.ctx, {
    issueDate: req.query.issueDate,
    docType: req.query.docType,
  })
  return res.json(result)
}
