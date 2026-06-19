namespace SmartClinicManagementSystem.Models
{
    public class Invoice
    {
        public string Id { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty; // e.g., TAX-2401
        public string PatientId { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string Service { get; set; } = "General Consultation";
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash"; // Cash, Card, Insurance, Bank Transfer
        public string Status { get; set; } = "Unpaid"; // Paid, Unpaid, Refunded
        public string Date { get; set; } = string.Empty; // YYYY-MM-DD
    }
}
