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
- Supplier checkout stores an order-specific HTTPS payment link and opens it externally; it never marks payment verified, changes stock, or duplicates expenses because supplier payment pages have no connected payment callbacks.
