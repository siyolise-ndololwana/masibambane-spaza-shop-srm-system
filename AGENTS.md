<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Product visuals are mapped through ProductImage using bundled category illustrations; this keeps stock and sale cards consistent without claiming generated images are exact brand packaging.
- Confirmation dialogs use ConfirmRecord and preserve form state until the save succeeds, preventing accidental sales or stock receipts.
- Registration password matching is validated by a shared browser-safe helper before signup; never store plaintext passwords.
- Supplier checkout opens order-specific HTTPS links externally; explicit staff payment confirmation uses an atomic database operation to save one linked expense and a separate payment status, never implying bank verification or receiving stock.
- Shared Masibambane branding is rendered by ShopBrand; shop settings persist singleton contact details and per-day hours, leaving unknown business details blank.
